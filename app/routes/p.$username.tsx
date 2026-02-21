import { useLoaderData } from "@remix-run/react";
import { type LoaderFunctionArgs, json, redirect } from "@remix-run/cloudflare";
import { getProfileByUsername } from "~/services/user.server";
import { UserRole } from "~/types";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Globe, Mail, FileText, Download, Phone, MapPin, Link as LinkIcon } from "lucide-react";
import { ConnectDialog } from "~/components/public/ConnectDialog";

export const loader = async ({ params, context }: LoaderFunctionArgs) => {
  const { username } = params;

  if (!username) {
    return redirect("/");
  }

  const profile = await getProfileByUsername(context, username);

  if (!profile) {
    throw new Response("Profile not found", { status: 404 });
  }

  // If user is BUSINESS_STAFF, verify they are accessed via correct company slug?
  // Actually, this route is for INDIVIDUAL (/p/$username).
  // If a business staff is accessed here, should we redirect to company URL?
  // Or just show profile?
  // The requirement says: "Role-based Redirection: /c/:shortCode must trigger a logic that redirects to /p/:username (Individual) or /:company_shortname/:username (Business Staff)."
  // It implies that Business Staff SHOULD be at /:company/:username.
  // But if someone manually types /p/:username for a staff, maybe we should redirect them to correct URL?
  
  if (profile.user.role === UserRole.BUSINESS_STAFF && profile.company) {
    return redirect(`/${profile.company.slug}/${profile.username}`);
  }

  return json({ profile });
};

export default function IndividualProfile() {
  const { profile } = useLoaderData<typeof loader>();
  const { user, links, documents } = profile;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-slate-200">
        <CardHeader className="flex flex-col items-center space-y-4 pb-2">
          <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
            <AvatarImage src={profile.avatarUrl || ""} alt={profile.displayName || user.name || ""} />
            <AvatarFallback className="text-2xl bg-slate-200 text-slate-600">
              {(profile.displayName || user.name || "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="text-center space-y-1">
            <CardTitle className="text-2xl font-bold text-slate-900">
              {profile.displayName || user.name}
            </CardTitle>
            {profile.bio && (
              <CardDescription className="text-slate-600 font-medium">
                {profile.bio}
              </CardDescription>
            )}
             <Badge variant="secondary" className="mt-2">
                Individual
             </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6 pt-4">
          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button className="w-full bg-slate-900 hover:bg-slate-800" asChild>
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

          {/* Contact Info */}
          <div className="space-y-3">
             {profile.publicEmail && (
               <a href={`mailto:${profile.publicEmail}`} className="flex items-center space-x-3 text-slate-600 bg-slate-100 p-3 rounded-lg hover:bg-slate-200 transition-colors">
                 <Mail className="h-5 w-5 text-slate-400" />
                 <span className="text-sm font-medium">{profile.publicEmail}</span>
               </a>
             )}
             {profile.publicPhone && (
               <a href={`tel:${profile.publicPhone}`} className="flex items-center space-x-3 text-slate-600 bg-slate-100 p-3 rounded-lg hover:bg-slate-200 transition-colors">
                 <Phone className="h-5 w-5 text-slate-400" />
                 <span className="text-sm font-medium">{profile.publicPhone}</span>
               </a>
             )}
             {profile.website && (
               <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-3 text-slate-600 bg-slate-100 p-3 rounded-lg hover:bg-slate-200 transition-colors">
                 <LinkIcon className="h-5 w-5 text-slate-400" />
                 <span className="text-sm font-medium truncate">{profile.website.replace(/^https?:\/\//, '')}</span>
               </a>
             )}
             {profile.location && (
               <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(profile.location)}`} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-3 text-slate-600 bg-slate-100 p-3 rounded-lg hover:bg-slate-200 transition-colors">
                 <MapPin className="h-5 w-5 text-slate-400" />
                 <span className="text-sm font-medium">{profile.location}</span>
               </a>
             )}
          </div>

          {/* Links */}
          {links.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Links</h3>
              <div className="grid gap-2">
                {links.map((link) => (
                  <a 
                    key={link.id} 
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="bg-blue-50 p-2 rounded-md mr-3 group-hover:bg-blue-100 transition-colors">
                      <Globe className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="font-medium text-slate-700">{link.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          {documents.length > 0 && (
             <div className="space-y-3">
               <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Documents</h3>
               <div className="grid gap-2">
                 {documents.map((doc) => (
                   <a 
                     key={doc.id}
                     href={doc.url}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="flex items-center p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                   >
                     <FileText className="h-5 w-5 text-orange-500 mr-3" />
                     <span className="font-medium text-slate-700 truncate">{doc.title}</span>
                   </a>
                 ))}
               </div>
             </div>
          )}
          
          <div className="pt-4 text-center">
             <p className="text-xs text-slate-400">Powered by ZanTag</p>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
