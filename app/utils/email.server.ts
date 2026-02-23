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
  if (!RESEND_API_KEY) {
     try {
       return await sendViaGmail(env, options);
     } catch (error) {
       console.error("Gmail sending failed:", error);
       throw error;
     }
  }

  const resend = new Resend(RESEND_API_KEY);

  const { data, error } = await resend.emails.send({
    from: env.EMAIL_FROM || "ZanTag <onboarding@resend.dev>",
    to: [options.to],
    subject: options.subject,
    html: options.html,
    text: options.text,
  });

  if (error) {
    console.error("Resend API Error:", error);
    // Fallback to Gmail if Resend fails? Optional, but let's stick to one provider per config for now to avoid confusion.
    throw new Error(`Resend API Error: ${error.message}`);
  }

  return data;
};

export const sendPasswordResetEmail = async (
  context: AppLoadContext,
  email: string,
  token: string
) => {
  const env = context.cloudflare.env;
  const appUrl = env.APP_URL || "https://zantag.com"; 
  // Using query param for simplicity in URL handling if route is flat, but path param is cleaner.
  // I will assume app/routes/reset-password.$token.tsx
  const resetLink = `${appUrl}/reset-password/${token}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Reset Your Password</h2>
      <p>You have requested to reset your password for your ZanTag account.</p>
      <p>Please click the button below to set a new password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
      </div>
      <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p style="color: #666; font-size: 14px; margin-top: 30px;">If you didn't request this, you can safely ignore this email. Your password will not change.</p>
      <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
    </div>
  `;

  return sendEmail(context, {
    to: email,
    subject: "Reset your ZanTag password",
    text: `Reset your password here: ${resetLink}`,
    html,
  });
};
