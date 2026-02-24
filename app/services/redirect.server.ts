import { type AppLoadContext } from "@remix-run/cloudflare";
import { getDb } from "~/utils/db.server";
import { getDomainUrl } from "~/utils/helpers";

type ProfileRedirectResult =
  | { type: "NOT_FOUND" }
  | { type: "ACTIVATE"; profileId: string; secretKey: string | null }
  | { type: "REDIRECT"; url: string };

export async function resolveProfileId(
  context: AppLoadContext,
  request: Request,
  profileId: string
): Promise<ProfileRedirectResult> {
  const db = getDb(context);
  const user = await db.user.findUnique({
    where: { profileId },
    include: {
      profile: {
        include: {
          company: true,
        },
      },
    },
  });

  if (!user) {
    return { type: "NOT_FOUND" };
  }

  if (!user.isActivated) {
    return { type: "ACTIVATE", profileId, secretKey: user.secretKey ?? null };
  }

  const username = user.profile?.username;
  if (!username) {
    return { type: "NOT_FOUND" };
  }

  const domainUrl = getDomainUrl(request, context);
  const redirectUrl = `${domainUrl}/user/${username}`;

  return {
    type: "REDIRECT",
    url: redirectUrl,
  };
}
