import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { getDb } from "~/utils/db.server";
import { requireAdmin } from "~/utils/session.server";
import { UserRole } from "~/types";

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  await requireAdmin(request, context);
  const db = getDb(context);
  
  const invitations = await db.inviteCode.findMany({
    orderBy: { createdAt: "desc" },
  });
  
  return json(invitations);
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  await requireAdmin(request, context);
  const db = getDb(context);

  if (request.method === "POST") {
    const { email, role, code } = await request.json() as { email?: string; role?: string; code?: string };
    
    // Generate unique code if not provided
    const newCode = code || `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    try {
      const invite = await db.inviteCode.create({
        data: {
          code: newCode,
          email: email || null,
          role: role || UserRole.INDIVIDUAL,
          isUsed: false,
        },
      });
      return json(invite);
    } catch (error) {
      return json({ error: (error as Error).message }, { status: 500 });
    }
  }

  if (request.method === "DELETE") {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return json({ error: "Missing ID" }, { status: 400 });

    await db.inviteCode.delete({ where: { id } });
    return json({ success: true });
  }

  return json({ error: "Method not allowed" }, { status: 405 });
};
