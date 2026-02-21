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
