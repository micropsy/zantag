import { type ActionFunctionArgs, json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { requireAdmin } from "~/utils/session.server";
import { getDb } from "~/utils/db.server";

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  await requireAdmin(request, context);
  const db = getDb(context);
  const settings = await db.systemSetting.findMany();
  // Convert to object for easier consumption { key: value }
  const settingsMap = settings.reduce((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {} as Record<string, string>);
  
  return json({ settings: settingsMap });
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  await requireAdmin(request, context);
  const db = getDb(context);
  const formData = await request.formData();
  
  const updates: Promise<unknown>[] = [];
  
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      updates.push(
        db.systemSetting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        })
      );
    }
  }

  try {
    await Promise.all(updates);
    return json({ success: true });
  } catch (error) {
    console.error("Failed to update settings:", error);
    return json({ error: "Failed to update settings" }, { status: 500 });
  }
};
