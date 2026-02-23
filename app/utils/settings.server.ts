import { type AppLoadContext } from "@remix-run/cloudflare";
import { getDb } from "~/utils/db.server";

export const getSystemSettings = async (context: AppLoadContext) => {
  const db = getDb(context);
  const settings = await db.systemSetting.findMany();
  return settings.reduce((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {} as Record<string, string>);
};

export const isInvitationOnlyMode = async (context: AppLoadContext) => {
  const settings = await getSystemSettings(context);
  return settings["invitationOnly"] === "true";
};
