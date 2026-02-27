import { type AppLoadContext } from "@remix-run/cloudflare";
import { getDb } from "~/utils/db.server";

const GOOGLE_AUTH_BASE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
  verified_email: boolean;
}

export async function getGoogleAuthUrl(redirectUri: string, clientId: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
  });

  return `${GOOGLE_AUTH_BASE_URL}?${params.toString()}`;
}

export async function exchangeGoogleCodeForToken(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken?: string }> {
  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  if (!response.ok) {
    throw new Error("Failed to exchange code for token");
  }

  const data = await response.json();
  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string | undefined,
  };
}

export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch user info");
  }

  return await response.json();
}

export async function findOrCreateUserByGoogle(
  context: AppLoadContext,
  googleInfo: GoogleUserInfo
) {
  const db = getDb(context);

  // Check if user exists with this Google ID
  let user = await db.user.findUnique({
    where: { googleId: googleInfo.id },
  });

  // If not found, check by email
  if (!user) {
    user = await db.user.findUnique({
      where: { email: googleInfo.email },
    });
  }

  if (user) {
    // Update Google ID if not set
    if (!user.googleId) {
      user = await db.user.update({
        where: { id: user.id },
        data: { googleId: googleInfo.id },
      });
    }
    return user;
  }

  // Create new user
  const profileId = `g_${googleInfo.id.substring(0, 8)}`;
  
  const newUser = await db.user.create({
    data: {
      email: googleInfo.email,
      name: googleInfo.name,
      googleId: googleInfo.id,
      role: "INDIVIDUAL",
      isActivated: true,
      isEmailVerified: googleInfo.verified_email,
      status: "ACTIVE",
      profileId,
    },
  });

  return newUser;
}
