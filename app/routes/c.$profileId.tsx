import { type LoaderFunctionArgs, redirect } from "@remix-run/cloudflare";
import { getDb } from "~/utils/db.server";

export const loader = async ({ params, context }: LoaderFunctionArgs) => {
  const { profileId } = params;

  if (!profileId) {
    return redirect("/");
  }

  const db = getDb(context);

  const user = await db.user.findUnique({
    where: { profileId },
  });

  if (!user) {
    throw new Response("Invalid ZanTag", { status: 404 });
  }

  if (!user.isActivated) {
    const searchParams = new URLSearchParams();
    searchParams.set("profileId", profileId);
    if (user.secretKey) {
      searchParams.set("inviteCode", user.secretKey);
    }
    return redirect(`/register?${searchParams.toString()}`);
  }

  return redirect(`/p/${profileId}`);
};

