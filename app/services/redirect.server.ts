import { type AppLoadContext } from "@remix-run/cloudflare";
import { getDb } from "~/utils/db.server";
import { UserRole } from "~/types";
import { getDomainUrl } from "~/utils/helpers";

export async function resolveShortCode(context: AppLoadContext, request: Request, shortCode: string) {
  const db = getDb(context);
  const domainUrl = getDomainUrl(request, context);
  const user = await db.user.findUnique({
    where: { shortCode },
    include: {
      profile: {
        include: {
          company: true
        }
      }
    }
  });

  if (!user) {
    return null; // Handle 404 or redirect to home
  }

  // Logic: 
  // If INDIVIDUAL -> /p/:username
  // If BUSINESS_STAFF -> /b/:company_slug/:username
  
  const username = user.profile?.username;
  if (!username) return "/"; // Fallback

  if (user.role === UserRole.BUSINESS_STAFF && user.profile?.company?.slug && user.status === "ACTIVE") {
    return `${domainUrl}/b/${user.profile.company.slug}/${username}`;
  }

  return `${domainUrl}/p/${username}`;
}
