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
    include: {
      profile: {
        include: {
          company: true,
        },
      },
    },
  });

  if (!user) {
    throw new Response("Invalid ZanTag", { status: 404 });
  }

  if (!user.isActivated) {
    const searchParams = new URLSearchParams();
    searchParams.set("id", profileId);
    if (user.secretKey) {
      searchParams.set("inviteCode", user.secretKey);
    }
    return redirect(`/register?${searchParams.toString()}`);
  }

  // Redirect to the best public URL
  if (user.profile) {
    // If it's a business staff and has a company, use the business URL
    if (user.role === "BUSINESS_STAFF" && user.profile.company) {
      return redirect(`/b/${user.profile.company.slug}/${user.profile.username}`);
    }
    
    // Otherwise use the standard username URL
    if (user.profile.username) {
      return redirect(`/p/${user.profile.username}`);
    }
  }

  // Fallback to the canonical ID URL if no username is set
  return redirect(`/p/${profileId}`);
};

