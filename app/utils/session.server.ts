import { createCookieSessionStorage, redirect, type AppLoadContext } from "@remix-run/cloudflare";
import { getDb } from "~/utils/db.server";

type SessionData = {
  userId: string;
};

type SessionFlashData = {
  error: string;
};

// Use a default secret for development if not provided
const DEFAULT_SECRET = "super-secret-session-key";

// Helper to get storage with context-aware secret
function getSessionStorage(context?: AppLoadContext) {
  // Try to get secret from context (Cloudflare)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env = (context?.cloudflare as any)?.env || {};
  const secret = env.SESSION_SECRET || (typeof process !== "undefined" && process.env.SESSION_SECRET) || DEFAULT_SECRET;
  
  return createCookieSessionStorage<SessionData, SessionFlashData>({
    cookie: {
      name: "__session",
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
      sameSite: "lax",
      secrets: [secret],
      secure: process.env.NODE_ENV === "production", // Only secure in production
    },
  });
}

// Export for backward compatibility if needed, but prefer getSession(request, context)
export const sessionStorage = getSessionStorage();

export async function getSession(request: Request, context?: AppLoadContext) {
  const cookie = request.headers.get("Cookie");
  return getSessionStorage(context).getSession(cookie);
}

export async function getUserId(request: Request, context?: AppLoadContext) {
  const session = await getSession(request, context);
  const userId = session.get("userId");
  return userId;
}

export async function getUser(request: Request, context: AppLoadContext) {
  const userId = await getUserId(request, context);
  if (typeof userId !== "string") {
    return null;
  }

  const db = getDb(context);
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true },
  });

  return user;
}

export async function requireUserId(request: Request, context?: AppLoadContext, redirectTo: string = new URL(request.url).pathname) {
  const userId = await getUserId(request, context);
  if (!userId) {
    const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
    throw redirect(`/login?${searchParams}`);
  }
  return userId;
}

export async function requireUser(request: Request, context: AppLoadContext) {
  const userId = await requireUserId(request, context);
  const db = getDb(context);
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      inviteCode: true,
    },
  });

  if (!user) {
    throw await logout(request, context);
  }

  return user;
}

export async function requireAdmin(request: Request, context: AppLoadContext) {
  const user = await requireUser(request, context);
  if (user.role !== "SUPER_ADMIN" && user.role !== "BUSINESS_ADMIN") {
    throw redirect("/dashboard");
  }
  return user;
}

export async function requireSuperAdmin(request: Request, context: AppLoadContext) {
  const user = await requireUser(request, context);
  if (user.role !== "SUPER_ADMIN") {
    throw redirect("/dashboard");
  }
  return user;
}

export async function createUserSession(userId: string, redirectTo: string, context?: AppLoadContext) {
  const session = await getSessionStorage(context).getSession();
  session.set("userId", userId);
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await getSessionStorage(context).commitSession(session),
    },
  });
}

export async function logout(request: Request, context?: AppLoadContext) {
  const session = await getSession(request, context);
  return redirect("/", {
    headers: {
      "Set-Cookie": await getSessionStorage(context).destroySession(session),
    },
  });
}
