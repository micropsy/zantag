import { type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { getDb } from "~/utils/db.server";
import { getDomainUrl } from "~/utils/helpers";

export const loader = async ({ params, request, context }: LoaderFunctionArgs) => {
  const { username } = params;

  if (!username) {
    return new Response("Missing username", { status: 400 });
  }

  const db = getDb(context);
  const profile = await db.profile.findUnique({
    where: { username },
    include: { 
      links: true, 
      user: true,
      company: { select: { slug: true, name: true } }
    },
  });

  if (!profile) {
    return new Response("Profile not found", { status: 404 });
  }

  const domainUrl = getDomainUrl(request, context);
  const isBusinessStaff = profile.user.role === "BUSINESS_STAFF" && profile.company?.slug;
  const profileUrl = isBusinessStaff 
    ? `${domainUrl}/b/${profile.company!.slug}/${profile.username}` 
    : `${domainUrl}/p/${profile.username}`;

  const displayName = profile.displayName || profile.username || "";
  // Simple name split attempt
  const parts = displayName.trim().split(/\s+/);
  const firstName = parts[0] || "";
  const lastName = parts.slice(1).join(" ") || "";
  
  // Generate vCard
  const vcard = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${displayName}`,
    `N:${lastName};${firstName};;;`,
    profile.company?.name ? `ORG:${profile.company.name}` : "",
    profile.bio ? `NOTE:${profile.bio}` : "",
    `URL;type=pref:${profileUrl}`,
    ...profile.links
      .filter((l) => l.type === "PHONE")
      .map((l) => `TEL;TYPE=CELL:${l.url.replace("tel:", "")}`),
    ...profile.links
      .filter((l) => l.type === "EMAIL")
      .map((l) => `EMAIL;TYPE=WORK:${l.url.replace("mailto:", "")}`),
    ...profile.links
      .filter((l) => l.type === "WEBSITE" || l.type === "SOCIAL")
      .map((l) => `URL:${l.url}`),
    "END:VCARD"
  ].filter(Boolean).join("\n");

  return new Response(vcard, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${username}.vcf"`,
    },
  });
};
