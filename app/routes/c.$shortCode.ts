import { type LoaderFunctionArgs, redirect } from "@remix-run/cloudflare";
import { resolveProfileId } from "~/services/redirect.server";
import { getDomainUrl } from "~/utils/helpers";

export const loader = async ({ request, params, context }: LoaderFunctionArgs) => {
  const { shortCode } = params;

  if (!shortCode) {
    return redirect("/");
  }

  try {
    const result = await resolveProfileId(context, request, shortCode);

    if (result.type === "NOT_FOUND") {
      return redirect("/?error=invalid_code");
    }

    if (result.type === "ACTIVATE") {
      const domainUrl = getDomainUrl(request, context);
      const params = new URLSearchParams();
      params.set("profileId", result.profileId);
      if (result.secretKey) {
        params.set("inviteCode", result.secretKey);
      }
      const activationUrl = `${domainUrl}/register?${params.toString()}`;
      return redirect(activationUrl);
    }

    if (result.type === "REDIRECT") {
      return redirect(result.url);
    }

    return redirect("/?error=redirect_failed");
  } catch (error) {
    console.error("Redirect error:", error);
    return redirect("/?error=redirect_failed");
  }
};
