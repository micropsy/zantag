import { type AppLoadContext } from "@remix-run/cloudflare";
import { getDb } from "~/utils/db.server";
import { generateRandomCode } from "./utils.server";

export async function generateUniqueProfileId(
  context: AppLoadContext,
  length = 5
): Promise<string> {
  const db = getDb(context);
  let id = generateRandomCode(length);
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    const existing = await db.user.findUnique({
      where: { profileId: id },
    });
    if (!existing) {
      isUnique = true;
    } else {
      id = generateRandomCode(length);
      attempts++;
    }
  }

  if (!isUnique) {
    throw new Error("Failed to generate a unique profile ID after multiple attempts.");
  }

  return id;
}

export async function createUser(
  context: AppLoadContext,
  data: {
    email: string;
    passwordHash: string;
    name?: string;
    role?: string;
    inviteCode?: string;
    profileId?: string;
  }
) {
  const db = getDb(context);
  const profileId = data.profileId ?? (await generateUniqueProfileId(context));

  return db.user.create({
    data: {
      email: data.email,
      password: data.passwordHash,
      name: data.name,
      role: data.role || "INDIVIDUAL",
      profileId,
      isActivated: true,
      status: "ACTIVE",
      inviteCode: data.inviteCode ? { connect: { code: data.inviteCode } } : undefined,
    },
  });
}

// Get user profile by username
export async function getProfileByUsername(context: AppLoadContext, username: string) {
  const db = getDb(context);
  return db.profile.findUnique({
    where: { username },
    include: {
      user: true,
      links: true,
      contacts: true,
      documents: true,
      company: true,
    },
  });
}

// Reserved words that cannot be used as usernames
export const RESERVED_USERNAMES = [
  "login",
  "register",
  "signup",
  "dashboard",
  "admin",
  "api",
  "settings",
  "user",
  "profile",
  "logout",
  "verify",
  "setup",
  "assets",
  "build",
  "favicon",
  "robots",
  "sitemap",
  "c", // Short code route
  "b", // Business route
  "p", // Individual route
];

// Validate username availability
export async function validateUsername(context: AppLoadContext, username: string) {
  // 1. Check format (letters, numbers, hyphens)
  const usernameRegex = /^[a-zA-Z0-9-]+$/;
  if (!usernameRegex.test(username)) {
    return { valid: false, message: "Username can only contain letters, numbers, and hyphens." };
  }

  // 2. Check reserved words
  if (RESERVED_USERNAMES.includes(username.toLowerCase())) {
    return { valid: false, message: "This username is reserved." };
  }

  // 3. Check database uniqueness
  const db = getDb(context);
  const existing = await db.profile.findUnique({
    where: { username },
  });

  if (existing) {
    return { valid: false, message: "Username is already taken." };
  }

  return { valid: true };
}

// Resolve username redirect logic
export async function resolveUsernameRedirect(context: AppLoadContext, username: string) {
  const profile = await getProfileByUsername(context, username);

  if (!profile) {
    return null;
  }

  if (profile.user.role === "BUSINESS_STAFF" && profile.company && profile.user.status === "ACTIVE") {
    return `/b/${profile.company.slug}/${profile.username}`;
  }

  if (!profile.user.profileId) {
    return null;
  }

  return `/p/${profile.user.profileId}`;
}
