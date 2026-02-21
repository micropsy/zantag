import { type AppLoadContext } from "@remix-run/cloudflare";
import { Resend } from "resend";

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

const sendViaGmail = async (env: Env, options: EmailOptions) => {
  const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REFRESH_TOKEN,
    EMAIL_USER,
  } = env;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN || !EMAIL_USER) {
    throw new Error("Missing Gmail configuration: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, or EMAIL_USER");
  }

  // 1. Refresh Access Token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to refresh Google access token: ${error}`);
  }

  const tokenData = await tokenResponse.json() as { access_token: string };
  const accessToken = tokenData.access_token;

  // 2. Construct Raw Email
  // Format:
  // To: ...
  // Subject: ...
  // Content-Type: text/html; charset=utf-8
  //
  // <html>...</html>

  const emailContent = [
    `To: ${options.to}`,
    `From: "ZanTag Support" <${EMAIL_USER}>`,
    `Subject: ${options.subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=utf-8",
    "",
    options.html,
  ].join("\r\n");

  // Base64Url encode
  const encodedEmail = btoa(unescape(encodeURIComponent(emailContent)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  // 3. Send via Gmail API
  const sendResponse = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        raw: encodedEmail,
      }),
    }
  );

  if (!sendResponse.ok) {
    const error = await sendResponse.text();
    throw new Error(`Failed to send email via Gmail API: ${error}`);
  }

  const sendData = await sendResponse.json() as { id: string };
  // console.log("Message sent via Gmail API:", sendData.id);
  return sendData;
};

export const sendEmail = async (context: AppLoadContext, options: EmailOptions) => {
  if (!context.cloudflare || !context.cloudflare.env) {
    throw new Error("Cloudflare context or environment variables are missing.");
  }

  const env = context.cloudflare.env;
  const { RESEND_API_KEY } = env;

  // Prioritize Gmail if Resend API Key is missing or user explicitly prefers Gmail (implied by absence of Resend key for now)
  // If RESEND_API_KEY exists, we can try to use it, or we can just stick to Gmail as requested.
  // The user said "Resend ကို Optional အဖြစ်သတ်မှတ်ထားတာဖြစ်ပါတယ်" (Resend is optional).
  // And "Gmail API ဖြင့်ချိတ်ဆက်အသုံးပြုရန်" (Connect using Gmail API).
  
  // Strategy: Try Gmail first if configured. If not, try Resend. Or vice versa?
  // User said "Resend when domain is bought", implying Gmail is CURRENT preference.
  
  // Let's check for Gmail config first.
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REFRESH_TOKEN) {
    try {
      return await sendViaGmail(env, options);
    } catch (error) {
      console.error("Gmail API failed, falling back/checking Resend...", error);
      // Fall through to Resend check
    }
  }

  if (RESEND_API_KEY) {
    const resend = new Resend(RESEND_API_KEY);
    try {
      const { data, error } = await resend.emails.send({
        from: env.EMAIL_FROM || "ZanTag <onboarding@resend.dev>",
        to: [options.to],
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      if (error) {
        throw new Error(error.message);
      }
      return data;
    } catch (error) {
      console.error("Resend API failed:", error);
      throw error;
    }
  }

  // If neither is configured
  console.log("---------------------------------------------------");
  console.log("Email Service Disabled (No Config)");
  console.log(`To: ${options.to}`);
  console.log(`Subject: ${options.subject}`);
  console.log("---------------------------------------------------");
  return { id: "mock-id" };
};
