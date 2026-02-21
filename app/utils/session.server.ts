import { createCookieSessionStorage, redirect, type AppLoadContext } from "@remix-run/cloudflare";
import { getDb } from "~/utils/db.server";

type SessionData = {
  userId: string;
};

type SessionFlashData = {
  error: string;
};

// Use a default secret for development if not provided
const SESSION_SECRET = (typeof process !== "undefined" && process.env.SESSION_SECRET) || "super-secret-session-key"; 

export const sessionStorage = createCookieSessionStorage<SessionData, SessionFlashData>({
  cookie: {
    name: "__session",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
    sameSite: "lax",
    secrets: [SESSION_SECRET], // In production, this should come from context.cloudflare.env
    secure: true, // Always true for Cloudflare Pages
  },
});

export async function getSession(request: Request) {
  const cookie = request.headers.get("Cookie");
  return sessionStorage.getSession(cookie);
}

export async function getUserId(request: Request) {
  const session = await getSession(request);
  const userId = session.get("userId");
  return userId;
}

export async function getUser(request: Request, context: AppLoadContext) {
  const userId = await getUserId(request);
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

export async function requireUserId(request: Request, redirectTo: string = new URL(request.url).pathname) {
  const userId = await getUserId(request);
  if (!userId) {
    const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
    throw redirect(`/login?${searchParams}`);
  }
  return userId;
}

export async function requireUser(request: Request, context: AppLoadContext) {
  const userId = await requireUserId(request);
  const db = getDb(context);
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      inviteCode: true,
    },
  });

  if (!user) {
    throw await logout(request);
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

export async function createUserSession(userId: string, redirectTo: string) {
  const session = await sessionStorage.getSession();
  session.set("userId", userId);
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session, {
        maxAge: 60 * 60 * 24 * 7, // 7 days
      }),
    },
  });
}

export async function logout(request: Request) {
  const session = await getSession(request);
  return redirect("/login", {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
}
