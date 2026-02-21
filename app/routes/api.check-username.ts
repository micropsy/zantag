import { type LoaderFunctionArgs, json } from "@remix-run/cloudflare";
import { validateUsername } from "~/services/user.server";

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const username = url.searchParams.get("username");

  if (!username) {
    return json({ available: false, message: "Username is required" }, { status: 400 });
  }

  // Validate username
  const result = await validateUsername(context, username);

  if (!result.valid) {
    return json({ available: false, message: result.message });
  }

  return json({ available: true, message: "Username is available!" });
};
