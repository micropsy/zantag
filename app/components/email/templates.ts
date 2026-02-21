
export const getBaseEmailLayout = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 8px; margin-top: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eaeaea; margin-bottom: 20px; }
    .logo { font-size: 24px; font-weight: bold; color: #0f172a; text-decoration: none; }
    .footer { text-align: center; font-size: 12px; color: #666; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; }
    .btn { display: inline-block; background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; margin-bottom: 20px; }
    .code { font-family: monospace; font-size: 24px; font-weight: bold; letter-spacing: 2px; background-color: #f1f5f9; padding: 10px 20px; border-radius: 4px; display: inline-block; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="https://zantag.vercel.app" class="logo">ZanTag</a>
    </div>
    ${content}
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ZanTag. All rights reserved.</p>
      <p>This email was sent to you because you requested an action on ZanTag.</p>
    </div>
  </div>
</body>
</html>
`;

export const getVerifyEmailHtml = (url: string, code?: string) => {
  const codeSection = code ? `
    <p>Your verification code is:</p>
    <div class="code">${code}</div>
    <p>Or click the button below:</p>
  ` : `<p>Click the button below to verify your email:</p>`;

  const content = `
    <h2>Verify your email address</h2>
    <p>Thanks for signing up for ZanTag! Please verify your email address to continue.</p>
    <div style="text-align: center;">
      ${codeSection}
      <a href="${url}" class="btn">Verify Email</a>
    </div>
    <p>If you didn't request this, you can safely ignore this email.</p>
  `;
  return getBaseEmailLayout(content);
};

export const getInviteEmailHtml = (code: string, url: string, inviterName: string = "ZanTag Team") => {
  const content = `
    <h2>You've been invited to ZanTag!</h2>
    <p>${inviterName} has invited you to join ZanTag, the professional digital business card platform.</p>
    <div style="text-align: center;">
      <p>Your invitation code is:</p>
      <div class="code">${code}</div>
      <p>Click below to accept your invitation:</p>
      <a href="${url}" class="btn">Accept Invitation</a>
    </div>
    <p>We can't wait to see your digital card!</p>
  `;
  return getBaseEmailLayout(content);
};

export const getLeadNotificationHtml = (leadName: string, leadEmail: string, profileName: string) => {
  const content = `
    <h2>New Lead Captured!</h2>
    <p>Good news, ${profileName}! You have a new lead on your digital card.</p>
    <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <p><strong>Name:</strong> ${leadName}</p>
      <p><strong>Email:</strong> ${leadEmail}</p>
    </div>
    <div style="text-align: center;">
      <a href="https://zantag.vercel.app/dashboard/leads" class="btn">View Lead Details</a>
    </div>
  `;
  return getBaseEmailLayout(content);
};
