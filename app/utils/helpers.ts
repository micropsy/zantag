import { type AppLoadContext } from "@remix-run/cloudflare";

/**
 * Gets the domain URL from the request or environment variables.
 * Prioritizes the environment variable APP_URL, then falls back to the request host.
 * 
 * @param request The request object
 * @param context The app load context (optional but recommended for accessing env vars)
 * @returns The base URL (e.g., https://zantag.com or http://localhost:8788) without trailing slash
 */
export function getDomainUrl(request: Request, context?: AppLoadContext): string {
  // 1. Check Environment Variable (Preferred for Production/Consistency)
  // Check context (Cloudflare/Pages) first
  let appUrl = context?.cloudflare?.env?.APP_URL;

  // If not in context, check process.env or import.meta.env (for local dev with some setups)
  if (!appUrl && typeof process !== "undefined" && process.env?.APP_URL) {
    appUrl = process.env.APP_URL;
  }
  
  if (!appUrl && typeof (import.meta as unknown as { env: Record<string, string> })?.env?.APP_URL === "string") {
    appUrl = (import.meta as unknown as { env: Record<string, string> }).env.APP_URL;
  }

  if (appUrl) {
    // Remove trailing slash if present
    return appUrl.replace(/\/$/, "");
  }

  // 2. Fallback to Request Host
  const host =
    request.headers.get("X-Forwarded-Host") ??
    request.headers.get("host");

  if (!host) {
    throw new Error("Could not determine domain URL.");
  }

  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}
