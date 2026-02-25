
import { useLoaderData } from "@remix-run/react";
import { type LoaderFunctionArgs, json, redirect, type SerializeFrom } from "@remix-run/cloudflare";
import { type User as PrismaUser, type Profile as PrismaProfile, type Link as PrismaLink, type Document as PrismaDocument, type Organization } from "@prisma/client";
import { getDb } from "~/utils/db.server";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Globe, Mail, FileText, Download, Phone, MapPin, Link as LinkIcon, Building, User, Share2 } from "lucide-react";
import { ConnectDialog } from "~/components/public/ConnectDialog";

type ProfileWithRelations = PrismaProfile & {
  user: Pick<PrismaUser, "id" | "name" | "email" | "profileId" | "isActivated">;
  links: PrismaLink[];
  documents: PrismaDocument[];
  company: Pick<Organization, "id" | "name" | "slug"> | null;
};

export const loader = async ({ params, context, request }: LoaderFunctionArgs) => {
  const { profileId } = params;

  if (!profileId) {
    return redirect("/");
  }

  const db = getDb(context);

  // Try to find by profileId first
  let user = await db.user.findUnique({
    where: { profileId },
    include: {
      profile: {
        include: {
          links: true,
          contacts: true,
          documents: true,
          company: true,
        },
      },
    },
  });

  // If not found by profileId, try to find by username
  if (!user) {
    const profile = await db.profile.findUnique({
      where: { username: profileId },
      include: {
        user: {
          include: {
            profile: {
              include: {
                links: true,
                contacts: true,
                documents: true,
                company: true,
              },
            },
          },
        },
      },
    });
    
    if (profile?.user) {
      user = profile.user as unknown as typeof user;
    }
  }

  if (!user || !user.profile) {
    throw new Response("Profile not found", { status: 404 });
  }

  if (!user.isActivated) {
    const searchParams = new URLSearchParams();
    searchParams.set("id", profileId);
    if (user.secretKey) {
      searchParams.set("inviteCode", user.secretKey);
    }
    return redirect(`/register?${searchParams.toString()}`);
  }

  // Cast to the expected type for the loader
  const profile = user.profile as unknown as ProfileWithRelations;

  const userAgent = request.headers.get("User-Agent") || "";
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);

  const mapProvider: "apple" | "google" = isIOS ? "apple" : "google";

  return json({ profile, mapProvider });
};

type SerializedLink = SerializeFrom<PrismaLink>;
type SerializedDocument = SerializeFrom<PrismaDocument>;

export default function IndividualProfile() {
  const { profile, mapProvider } = useLoaderData<typeof loader>();
  const { user, links, documents } = profile;

  const getIcon = (type: string) => {
    switch (type) {
      case "PHONE": return <Phone className="h-5 w-5" />;
      case "EMAIL": return <Mail className="h-5 w-5" />;
      case "WEBSITE": return <Globe className="h-5 w-5" />;
      case "LOCATION": return <MapPin className="h-5 w-5" />;
      case "SOCIAL": return <Share2 className="h-5 w-5" />;
      default: return <LinkIcon className="h-5 w-5" />;
    }
  };

  const buildHref = (link: SerializedLink) => {
    const raw = (link.url || "").trim();

    if (!raw) return "#";

    switch (link.type) {
      case "PHONE": {
        const phone = raw.replace(/^tel:/i, "");
        return `tel:${phone}`;
      }
      case "EMAIL": {
        const email = raw.replace(/^mailto:/i, "");
        return `mailto:${email}`;
      }
      case "WEBSITE": {
        if (/^https?:\/\//i.test(raw)) return raw;
        return `https://${raw}`;
      }
      case "LOCATION": {
        const query = encodeURIComponent(raw);
        if (mapProvider === "apple") {
          return `https://maps.apple.com/?q=${query}`;
        }
        return `https://www.google.com/maps/search/?api=1&query=${query}`;
      }
      default:
        return raw;
    }
  };

  const getDisplayValue = (link: SerializedLink) => {
    const raw = (link.url || "").trim();

    if (!raw) return "";

    switch (link.type) {
      case "PHONE": {
        return raw.replace(/^tel:/i, "");
      }
      case "EMAIL": {
        return raw.replace(/^mailto:/i, "");
      }
      default:
        return raw.replace(/^https?:\/\//i, "");
    }
  };

  const renderLinks = (category: "OFFICE" | "PERSONAL") => {
    const filtered = links.filter(
      (link) => (link.category || "PERSONAL") === category
    );

    if (filtered.length === 0) {
      return (
        <div className="text-sm text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 text-center">
          No {category === "OFFICE" ? "office" : "personal"} contact details added yet.
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {filtered.map((link) => (
          <a
            key={link.id}
            href={buildHref(link)}
            target={link.type === "WEBSITE" ? "_blank" : undefined}
            rel={link.type === "WEBSITE" ? "noopener noreferrer" : undefined}
            className="flex items-center p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mr-3 text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition-colors">
              {getIcon(link.type)}
            </div>
            <div className="flex-1">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">
                {link.title || link.type.toLowerCase()}
              </div>
              <div className="text-sm font-medium text-slate-900 truncate">
                {getDisplayValue(link)}
              </div>
            </div>
          </a>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center py-8 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
          <div className="h-32 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 relative">
            {profile.bannerUrl ? (
              <img
                src={profile.bannerUrl}
                alt="Profile banner"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-slate-800 to-slate-900 flex items-center justify-center">
                <span className="text-slate-700 font-bold text-4xl opacity-20 select-none">ZanTag</span>
              </div>
            )}
          </div>

          <div className="px-6 relative">
            <div className="flex justify-between items-end -mt-16 mb-4">
              <Avatar className="h-32 w-32 border-4 border-white shadow-xl bg-white">
                <AvatarImage src={profile.avatarUrl || ""} alt={profile.displayName || user.name || ""} className="object-cover" />
                <AvatarFallback className="text-4xl bg-slate-100 text-slate-400">
                  {(profile.displayName || user.name || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="space-y-1 mb-6">
              <h1 className="text-2xl font-bold text-slate-900 leading-tight">
                {profile.displayName || user.name}
              </h1>
              
              {(profile.position || profile.department) && (
                <p className="text-slate-600 font-medium text-lg">
                  {[profile.position, profile.department].filter(Boolean).join(" • ")}
                </p>
              )}
              
              {profile.companyName && (
                <p className="text-slate-500 flex items-center gap-1.5">
                  <Building className="h-4 w-4" />
                  {profile.companyName}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-8">
              <Button className="w-full bg-slate-900 hover:bg-slate-800 shadow-md transition-all hover:shadow-lg" asChild>
                <a href={`/api/vcard/${profile.username}`} download>
                  <Download className="mr-2 h-4 w-4" />
                  Save Contact
                </a>
              </Button>
              <ConnectDialog 
                profileId={profile.id} 
                profileName={profile.displayName || user.name || "User"} 
              />
            </div>

            {profile.bio && (
              <div className="mb-8 p-4 bg-slate-50 rounded-xl border border-slate-100 text-slate-600 leading-relaxed text-sm">
                {profile.bio}
              </div>
            )}

            <div className="mb-8">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Contact Information</h2>
              <Tabs defaultValue="OFFICE" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 p-1 bg-slate-100 rounded-xl">
                  <TabsTrigger value="OFFICE" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary py-2.5">
                    <Building className="h-4 w-4 mr-2" /> Office
                  </TabsTrigger>
                  <TabsTrigger value="PERSONAL" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary py-2.5">
                    <User className="h-4 w-4 mr-2" /> Personal
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="OFFICE" className="animate-in fade-in slide-in-from-left-2 duration-300">
                  {renderLinks("OFFICE")}
                </TabsContent>
                <TabsContent value="PERSONAL" className="animate-in fade-in slide-in-from-right-2 duration-300">
                  {renderLinks("PERSONAL")}
                </TabsContent>
              </Tabs>
            </div>

            {documents.length > 0 && (
              <div className="mb-8">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Documents</h2>
                <div className="space-y-3">
                  {documents.map((doc: SerializedDocument) => (
                    <a 
                      key={doc.id}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center p-4 rounded-xl border border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/50 transition-all shadow-sm group"
                    >
                      <div className="bg-orange-100 p-2.5 rounded-full mr-4 text-orange-600 group-hover:scale-110 transition-transform">
                        <FileText className="h-5 w-5" />
                      </div>
                      <span className="font-medium text-slate-700 truncate flex-1">{doc.title}</span>
                      <Download className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-12 mb-6 text-center">
              <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-slate-100 text-xs font-medium text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                Powered by ZanTag
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

