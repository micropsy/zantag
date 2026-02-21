import { useLoaderData } from "@remix-run/react";
import { type LoaderFunctionArgs, json, redirect } from "@remix-run/cloudflare";
import { getProfileByUsername } from "~/services/user.server";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Globe, Mail, FileText, Download, Building } from "lucide-react";
import { getDb } from "~/utils/db.server";

export const loader = async ({ params, context }: LoaderFunctionArgs) => {
  const { companySlug, username } = params;

  if (!companySlug || !username) {
    return redirect("/");
  }

  // 1. Get Company
  const db = getDb(context);
  const company = await db.organization.findUnique({
    where: { slug: companySlug },
  });

  if (!company) {
    throw new Response("Company not found", { status: 404 });
  }

  // 2. Get Profile
  const profile = await getProfileByUsername(context, username);

  if (!profile) {
    throw new Response("Profile not found", { status: 404 });
  }

  // 3. Verify Association
  if (profile.companyId !== company.id) {
     // User exists but is not part of this company.
     // Should we redirect to their actual profile?
     // Or 404 to protect privacy/association?
     // Let's redirect to their correct profile if public, or 404.
     // For now, 404 to mimic "Member not found in this organization".
     throw new Response("Member not found in this organization", { status: 404 });
  }
  
  // 4. Check if user is active/separated
  if (profile.user.status === "INACTIVE") {
      // User is now a permanent Individual, redirect to their personal profile
      return redirect(`/p/${username}`);
  }

  if (profile.user.status === "GRACE_PERIOD" && profile.user.separatedAt) {
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - new Date(profile.user.separatedAt).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 30) {
         // Grace period over, treated as permanent Individual
         return redirect(`/p/${username}`);
      }
      // If within 30 days, they are still shown as staff (or maybe with a warning?)
      // For now, we show them as staff until deleted or finalized.
  }

  return json({ profile, company });
};

export default function CompanyProfile() {
  const { profile, company } = useLoaderData<typeof loader>();
  const { user, links, documents } = profile;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      {/* Company Header */}
      <div className="mb-8 text-center">
         {company.logo ? (
            <img src={company.logo} alt={company.name} className="h-12 mx-auto mb-2" />
         ) : (
            <div className="flex items-center justify-center space-x-2 text-slate-700">
               <Building className="h-8 w-8" />
               <h1 className="text-2xl font-bold">{company.name}</h1>
            </div>
         )}
      </div>

      <Card className="w-full max-w-md shadow-xl border-slate-200 relative overflow-hidden">
        {/* Company Brand Stripe */}
        <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>

        <CardHeader className="flex flex-col items-center space-y-4 pb-2 pt-8">
          <Avatar className="h-24 w-24 border-4 border-white shadow-lg ring-2 ring-blue-100">
            <AvatarImage src={profile.avatarUrl || ""} alt={profile.displayName || user.name || ""} />
            <AvatarFallback className="text-2xl bg-blue-50 text-blue-600">
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
             <Badge variant="outline" className="mt-2 border-blue-200 text-blue-700 bg-blue-50">
                {company.name} Staff
             </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6 pt-4">
          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button className="w-full bg-blue-600 hover:bg-blue-700" asChild>
              <a href={`/api/vcard/${profile.username}`} download>
                <Download className="mr-2 h-4 w-4" />
                Save Contact
              </a>
            </Button>
            <Button variant="outline" className="w-full border-blue-200 hover:bg-blue-50 text-blue-700">
               Connect
            </Button>
          </div>

          {/* Contact Info */}
          <div className="space-y-3">
             {user.email && (
               <div className="flex items-center space-x-3 text-slate-600 bg-slate-100 p-3 rounded-lg border border-slate-200">
                 <Mail className="h-5 w-5 text-slate-400" />
                 <span className="text-sm font-medium">{user.email}</span>
               </div>
             )}
          </div>

          {/* Links */}
          {links.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Business Links</h3>
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
               <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Company Documents</h3>
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
             <p className="text-xs text-slate-400">Powered by ZanTag & {company.name}</p>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
