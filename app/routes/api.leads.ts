import { type ActionFunctionArgs, json } from "@remix-run/cloudflare";
import { getDb } from "~/utils/db.server";
import { sendEmail } from "~/utils/email.server";
import { getLeadNotificationHtml } from "~/components/email/templates";

export const action = async ({ request, context }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const db = getDb(context);
    const body = await request.json() as { profileId: string; name: string; email?: string; phone?: string; notes?: string; source?: string };
    const { profileId, name, email, phone, notes, source } = body;

    if (!profileId || !name) {
      return json({ error: "Missing required fields" }, { status: 400 });
    }

    const contact = await db.contact.create({
      data: {
        profileId,
        name,
        email,
        phone,
        notes,
        source: source || "FORM",
      },
      include: {
        profile: {
          include: {
            user: true,
          },
        },
      },
    });

    // Send email notification to profile owner
    if (contact.profile?.user?.email) {
      const profileName = contact.profile.displayName || contact.profile.user.name || "User";
      
      // Use setImmediate or similar if possible to not block response, 
      // but in Cloudflare Workers we should await or use ctx.waitUntil if available.
      // context.cloudflare.ctx.waitUntil is available on context.
      
      const emailPromise = sendEmail(context, {
        to: contact.profile.user.email,
        subject: "New Lead Captured on ZanTag",
        html: getLeadNotificationHtml(name, email || "No email provided", profileName),
        text: `Good news, ${profileName}! You have a new lead: ${name} (${email || "No email provided"}). Check your dashboard for details.`,
      }).catch(err => {
        console.error("Failed to send lead notification email:", err);
      });

      if (context.cloudflare?.ctx?.waitUntil) {
        context.cloudflare.ctx.waitUntil(emailPromise);
      } else {
        await emailPromise;
      }
    }

    return json({ success: true, contact: { id: contact.id, name: contact.name } });
  } catch (error) {
    console.error("Lead submission error:", error);
    return json({ error: (error as Error).message }, { status: 500 });
  }
};
