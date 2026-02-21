import { type LoaderFunctionArgs, redirect } from "@remix-run/cloudflare";
import { resolveUsernameRedirect, RESERVED_USERNAMES } from "~/services/user.server";

export const loader = async ({ params, context }: LoaderFunctionArgs) => {
  const { username } = params;

  if (!username) {
    return redirect("/");
  }

  // 1. Check Reserved Words
  // If it's a reserved word, and we reached this dynamic route, 
  // it means there is no specific route file for it.
  // We should return 404 to avoid checking DB for things like "favicon.ico"
  if (RESERVED_USERNAMES.includes(username.toLowerCase())) {
    throw new Response("Not Found", { status: 404 });
  }

  // 2. Resolve Redirect
  const redirectUrl = await resolveUsernameRedirect(context, username);

  if (redirectUrl) {
    return redirect(redirectUrl);
  }

  // 3. Not Found
  throw new Response("User not found", { status: 404 });
};
