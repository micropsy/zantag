import { type ActionFunctionArgs, json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { requireAdmin } from "~/utils/session.server";
import { getDb } from "~/utils/db.server";

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  await requireAdmin(request, context);
  const db = getDb(context);
  const settings = await db.systemSetting.findMany();
  
  const settingsMap = settings.reduce((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {} as Record<string, string>);
  
  return json({
    invitationOnly: settingsMap["invitationOnly"] === "true"
  });
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  await requireAdmin(request, context);
  const db = getDb(context);
  
  let data: Record<string, unknown>;
  const contentType = request.headers.get("Content-Type");

  if (contentType?.includes("application/json")) {
    data = await request.json();
  } else {
    const formData = await request.formData();
    data = Object.fromEntries(formData);
  }
  
  const updates: Promise<unknown>[] = [];
  
  for (const [key, value] of Object.entries(data)) {
    const stringValue = String(value);
    
    updates.push(
      db.systemSetting.upsert({
        where: { key },
        update: { value: stringValue },
        create: { key, value: stringValue },
      })
    );
  }

  try {
    await Promise.all(updates);
    return json({ success: true });
  } catch (error) {
    console.error("Failed to update settings:", error);
    return json({ error: "Failed to update settings" }, { status: 500 });
  }
};
