import { type LoaderFunctionArgs, type ActionFunctionArgs, json, redirect } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { getDb } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";
import { LeadsList } from "~/components/dashboard/LeadsList";
import { ManualLeadForm } from "~/components/dashboard/ManualLeadForm";
import { RouteErrorBoundary } from "~/components/RouteErrorBoundary";

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request);
  const db = getDb(context);
  
  const profile = await db.profile.findUnique({
    where: { userId },
    select: { id: true }
  });

  if (!profile) {
    return redirect("/dashboard");
  }

  const leads = await db.contact.findMany({
    where: { profileId: profile.id },
    orderBy: { createdAt: "desc" }
  });

  return json({ leads, profileId: profile.id });
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create-lead") {
    const profileId = formData.get("profileId") as string;
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const notes = formData.get("notes") as string;

    if (!name) {
      return json({ error: "Name is required" }, { status: 400 });
    }

    const db = getDb(context);
    
    // Verify profile ownership
    const profile = await db.profile.findUnique({
      where: { id: profileId },
      select: { userId: true }
    });

    if (!profile || profile.userId !== userId) {
      return json({ error: "Unauthorized" }, { status: 403 });
    }

    await db.contact.create({
      data: {
        profileId,
        name,
        email,
        phone,
        notes: notes, // Mapping notes to notes field
      }
    });

    return json({ success: true });
  }

  return json({ error: "Invalid intent" }, { status: 400 });
};

import { PageHeader } from "~/components/ui/page-header";

export default function DashboardLeads() {
  const { leads, profileId } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader 
          title="Leads" 
          description="Manage and track your captured leads." 
        />
        <ManualLeadForm profileId={profileId} />
      </div>

      <LeadsList leads={leads} />
    </div>
  );
}

export { RouteErrorBoundary as ErrorBoundary };
