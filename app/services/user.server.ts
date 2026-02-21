import { type AppLoadContext } from "@remix-run/cloudflare";
import { getDb } from "~/utils/db.server";
import { generateRandomCode } from "./utils.server";

// Generate a unique 5-character short code
export async function generateUniqueShortCode(context: AppLoadContext): Promise<string> {
  const db = getDb(context);
  let code = generateRandomCode(5);
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    const existing = await db.user.findUnique({
      where: { shortCode: code },
    });
    if (!existing) {
      isUnique = true;
    } else {
      code = generateRandomCode(5);
      attempts++;
    }
  }

  if (!isUnique) {
    throw new Error("Failed to generate a unique short code after multiple attempts.");
  }

  return code;
}

// Create a new user with automatic shortCode
export async function createUser(
  context: AppLoadContext,
  data: {
    email: string;
    passwordHash: string;
    name?: string;
    role?: string;
    inviteCode?: string;
  }
) {
  const db = getDb(context);
  const shortCode = await generateUniqueShortCode(context);

  return db.user.create({
    data: {
      email: data.email,
      password: data.passwordHash,
      name: data.name,
      role: data.role || "INDIVIDUAL",
      shortCode,
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
  "signup",
  "dashboard",
  "admin",
  "api",
  "settings",
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

  // Dynamic Switch Logic
  if (profile.user.role === "BUSINESS_STAFF" && profile.company && profile.user.status === "ACTIVE") {
    return `/b/${profile.company.slug}/${profile.username}`;
  }

  // Default to Individual Profile
  return `/p/${profile.username}`;
}
