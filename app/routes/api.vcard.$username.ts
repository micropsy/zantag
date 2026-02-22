
import { type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { type Profile, type Link, type User } from "@prisma/client";
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
  }) as (Profile & {
    links: Link[];
    user: User;
    company: { slug: string; name: string } | null;
    companyName?: string | null;
    position?: string | null;
    department?: string | null;
  }) | null;

  if (!profile) {
    return new Response("Profile not found", { status: 404 });
  }

  const domainUrl = getDomainUrl(request, context);
  // Always point to the Master Link (/user/:username) which handles Dynamic Switch
  const profileUrl = `${domainUrl}/user/${profile.username}`;

  const displayName = profile.displayName || profile.username || "";
  // Simple name split attempt
  const parts = displayName.trim().split(/\s+/);
  const firstName = parts[0] || "";
  const lastName = parts.slice(1).join(" ") || "";
  
  const companyName = profile.companyName || profile.company?.name || "";
  const position = profile.position || "";
  const department = profile.department || "";

  // Generate vCard
  const vcard = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${displayName}`,
    `N:${lastName};${firstName};;;`,
    companyName ? `ORG:${companyName}${department ? ';' + department : ''}` : "",
    position ? `TITLE:${position}` : "",
    profile.bio ? `NOTE:${profile.bio}` : "",
    `URL;type=pref:${profileUrl}`,
    ...profile.links
      .filter((l) => l.type === "PHONE")
      .map((l) => {
        const type = (l.category || "PERSONAL") === "OFFICE" ? "WORK,VOICE" : "CELL,VOICE";
        return `TEL;TYPE=${type}:${l.url.replace("tel:", "")}`;
      }),
    ...profile.links
      .filter((l) => l.type === "EMAIL")
      .map((l) => {
        const type = (l.category || "PERSONAL") === "OFFICE" ? "WORK" : "HOME";
        return `EMAIL;TYPE=${type}:${l.url.replace("mailto:", "")}`;
      }),
    ...profile.links
      .filter((l) => l.type === "WEBSITE" || l.type === "SOCIAL")
      .map((l) => `URL:${l.url}`),
    ...profile.links
        .filter((l) => l.type === "LOCATION")
        .map((l) => {
             const type = (l.category || "PERSONAL") === "OFFICE" ? "WORK" : "HOME";
             return `ADR;TYPE=${type}:;;${l.url.replace(/;/g, ',')};;;;`;
        }),
    "END:VCARD"
  ].filter(Boolean).join("\n");

  return new Response(vcard, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${username}.vcf"`,
    },
  });
};
