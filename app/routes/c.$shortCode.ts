import { type LoaderFunctionArgs, redirect } from "@remix-run/cloudflare";
import { resolveShortCode } from "~/services/redirect.server";

export const loader = async ({ request, params, context }: LoaderFunctionArgs) => {
  const { shortCode } = params;

  if (!shortCode) {
    return redirect("/");
  }

  try {
    const destination = await resolveShortCode(context, request, shortCode);
    
    if (!destination) {
      // Short code not found
      // Could redirect to a 404 page or home with error
      return redirect("/?error=invalid_code");
    }

    return redirect(destination);
  } catch (error) {
    console.error("Redirect error:", error);
    return redirect("/?error=redirect_failed");
  }
};
