import { json, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { useEffect, useState } from "react";
import { getDb } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";
import { getDomainUrl } from "~/utils/helpers";
import { validateUsername } from "~/services/user.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2, Link as LinkIcon, Save, Copy, Check, X, Loader2 } from "lucide-react";
import { RouteErrorBoundary } from "~/components/RouteErrorBoundary";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

import { profileSchema } from "~/utils/schemas";

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request);
  const db = getDb(context);

  const profile = await db.profile.findUnique({
    where: { userId },
    include: {
      links: true,
      user: { select: { role: true, shortCode: true, name: true } },
      company: { select: { slug: true } },
    },
  });

  if (!profile) {
    return redirect("/dashboard");
  }

  const domainUrl = getDomainUrl(request, context);

  return json({ profile, domainUrl });
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const userId = await requireUserId(request);
  const db = getDb(context);
  
  // Verify profile ownership
  const existingProfile = await db.profile.findUnique({
    where: { userId },
  });

  if (!existingProfile) {
    return json({ error: "Profile not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "update-profile") {
    const rawData = {
      displayName: formData.get("displayName") as string,
      username: formData.get("username") as string,
      bio: formData.get("bio") as string,
      primaryColor: formData.get("primaryColor") as string,
      secondaryColor: formData.get("secondaryColor") as string,
      publicPhone: formData.get("publicPhone") as string,
      publicEmail: formData.get("publicEmail") as string,
      website: formData.get("website") as string,
      location: formData.get("location") as string,
    };

    const result = profileSchema.safeParse(rawData);
    if (!result.success) {
      return json({ 
        success: false, 
        errors: result.error.flatten().fieldErrors 
      }, { status: 400 });
    }

    const { displayName, username, bio, primaryColor, secondaryColor, publicPhone, publicEmail, website, location } = result.data;

    // Check username uniqueness if changed
    if (username && username !== existingProfile.username) {
      const validation = await validateUsername(context, username);
      if (!validation.valid) {
        return json({ 
          success: false, 
          errors: { username: [validation.message || "Invalid username"] } 
        }, { status: 400 });
      }
    }

    await db.profile.update({
      where: { id: existingProfile.id },
      data: { 
        displayName: displayName || undefined,
        username: username || undefined,
        bio,
        primaryColor: primaryColor || undefined,
        secondaryColor: secondaryColor || undefined,
        publicPhone: publicPhone || null,
        publicEmail: publicEmail || null,
        website: website || null,
        location: location || null,
      },
    });

    return json({ success: true });
  }

  if (intent === "add-link") {
    const title = formData.get("title") as string;
    const url = formData.get("url") as string;
    
    if (!title || !url) {
        return json({ error: "Title and URL are required" }, { status: 400 });
    }

    await db.link.create({
      data: {
        profileId: existingProfile.id,
        title,
        url,
        type: "SOCIAL",
      },
    });

    return json({ success: true });
  }

  if (intent === "delete-link") {
    const linkId = formData.get("linkId") as string;

    await db.link.delete({
      where: { id: linkId },
    });

    return json({ success: true });
  }

  return json({ error: "Invalid intent" }, { status: 400 });
};

export default function DashboardProfile() {
  const { profile, domainUrl } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === "submitting";
  
  // Username validation
  const usernameFetcher = useFetcher<{ available: boolean; message: string }>();
  const [username, setUsername] = useState(profile.username);
  const [isUsernameChecking, setIsUsernameChecking] = useState(false);

  // Local state for branding preview
  const [primaryColor, setPrimaryColor] = useState(profile.primaryColor || "#0F172A");
  const [secondaryColor, setSecondaryColor] = useState(profile.secondaryColor || "#06B6D4");

  // Update state when profile changes (e.g. after save)
  useEffect(() => {
    if (profile.primaryColor && profile.primaryColor !== primaryColor) {
      setPrimaryColor(profile.primaryColor);
    }
    if (profile.secondaryColor && profile.secondaryColor !== secondaryColor) {
      setSecondaryColor(profile.secondaryColor);
    }
    if (profile.username && profile.username !== username) {
      setUsername(profile.username);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUsername(val);
    
    if (val.length >= 3 && val !== profile.username) {
      setIsUsernameChecking(true);
      // Debounce could be added here, but for now simple delay
      const timer = setTimeout(() => {
        usernameFetcher.load(`/api/check-username?username=${val}`);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setIsUsernameChecking(false);
    }
  };

  useEffect(() => {
    if (usernameFetcher.state === "idle" && isUsernameChecking) {
      setIsUsernameChecking(false);
    }
  }, [usernameFetcher.state, isUsernameChecking]);

  const actionData = fetcher.data as { success?: boolean; errors?: Record<string, string[]> };

  useEffect(() => {
    if (fetcher.state === "idle" && actionData) {
      if (actionData.success) {
        toast.success("Profile updated successfully");
      } else if (actionData.errors) {
        toast.error("Please fix the errors below");
      }
    }
  }, [actionData, fetcher.state]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const permanentUrl = profile.user.shortCode 
    ? `${domainUrl}/c/${profile.user.shortCode}`
    : `${domainUrl}/p/${profile.username}`; // Fallback if shortCode missing

  const isUsernameValid = usernameFetcher.data?.available;
  const usernameMessage = usernameFetcher.data?.message;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Profile</h1>
          <p className="text-muted-foreground">Customize how others see your digital card.</p>
        </div>
        <Button 
          type="submit" 
          form="profile-form" 
          disabled={isSubmitting || (username !== profile.username && isUsernameValid === false)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Form */}
        <fetcher.Form method="post" id="profile-form" className="lg:col-span-2 space-y-6">
           <input type="hidden" name="intent" value="update-profile" />
           
           {/* Public Profile URL */}
           <Card>
              <CardHeader>
                <CardTitle className="text-base">Public Profile URL</CardTitle>
                <CardDescription>Customize your profile link and share your card.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Profile Identity Info */}
                <div className="flex items-center justify-between p-3 bg-slate-50 border rounded-md">
                   <div className="flex flex-col">
                      <span className="text-[10px] uppercase text-muted-foreground font-semibold">Profile Name</span>
                      <span className="text-sm font-medium text-slate-900">{profile.displayName || profile.user.name || "N/A"}</span>
                   </div>
                   <div className="flex flex-col items-end">
                      <span className="text-[10px] uppercase text-muted-foreground font-semibold">Short Code</span>
                      <span className="text-sm font-mono text-slate-900">{profile.user.shortCode || "Pending"}</span>
                   </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-xs font-medium uppercase text-muted-foreground">Custom URL</Label>
                  <div className="flex rounded-md shadow-sm relative">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                      {domainUrl.replace(/^https?:\/\//, "")}/
                    </span>
                    <Input
                      id="username"
                      name="username"
                      value={username}
                      onChange={handleUsernameChange}
                      placeholder="username"
                      className={`rounded-l-none pr-10 ${
                        username !== profile.username && isUsernameValid === false ? "border-red-500 focus-visible:ring-red-500" : 
                        username !== profile.username && isUsernameValid === true ? "border-green-500 focus-visible:ring-green-500" : ""
                      }`}
                    />
                    <div className="absolute right-3 top-2.5">
                       {isUsernameChecking ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                       ) : username !== profile.username && isUsernameValid === true ? (
                          <Check className="h-4 w-4 text-green-500" />
                       ) : username !== profile.username && isUsernameValid === false ? (
                          <X className="h-4 w-4 text-red-500" />
                       ) : null}
                    </div>
                  </div>
                  
                  {/* Redirect Indicator */}
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground pl-1">
                     <LinkIcon className="h-3 w-3" />
                     <span>Redirects to:</span>
                     <span className="font-mono text-emerald-600 bg-emerald-50 px-1 rounded">
                       {profile.user.role === "BUSINESS_STAFF" && profile.company 
                         ? `/b/${profile.company.slug}/${username}` 
                         : `/p/${username}`}
                     </span>
                  </div>

                  {username !== profile.username && usernameMessage && (
                    <p className={`text-sm ${isUsernameValid ? "text-green-600" : "text-red-500"}`}>
                      {usernameMessage}
                    </p>
                  )}
                  {actionData?.errors?.username && (
                    <p className="text-sm text-red-500">{actionData.errors.username[0]}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">Only letters, numbers, and hyphens allowed.</p>
                </div>

                <div className="space-y-2">
                   <Label className="text-xs font-medium uppercase text-muted-foreground">Permanent URL (Short Link)</Label>
                   <div className="flex items-center space-x-2">
                      <div className="flex-1 p-2 bg-slate-50 border rounded-md text-sm text-slate-600 font-mono truncate">
                        {permanentUrl}
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => copyToClipboard(permanentUrl)}>
                        <Copy className="h-4 w-4 mr-2" /> Copy
                      </Button>
                   </div>
                   <p className="text-[10px] text-muted-foreground">Use this link for physical NFC cards. It will never change even if you update your Custom URL.</p>
                </div>
              </CardContent>
           </Card>

           {/* Basic Information */}
           <Card>
              <CardHeader>
                <CardTitle className="text-base">Basic Information</CardTitle>
                <CardDescription>Update your bio and description.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    name="displayName"
                    defaultValue={profile.displayName || profile.user.name || ""}
                    placeholder="Your Full Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    defaultValue={profile.bio || ""}
                    placeholder="Tell us about yourself"
                    className="min-h-[100px]"
                  />
                </div>
              </CardContent>
           </Card>

           {/* Contact Methods */}
           <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact Methods</CardTitle>
                <CardDescription>These appear at the top of your public card.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="publicPhone">Phone</Label>
                    <Input
                      id="publicPhone"
                      name="publicPhone"
                      defaultValue={profile.publicPhone || ""}
                      placeholder="+959 1234 5678"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="publicEmail">Public Email</Label>
                    <Input
                      id="publicEmail"
                      name="publicEmail"
                      type="email"
                      defaultValue={profile.publicEmail || ""}
                      placeholder="contact@example.com"
                    />
                    {actionData?.errors?.publicEmail && (
                      <p className="text-sm text-red-500">{actionData.errors.publicEmail[0]}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      name="website"
                      defaultValue={profile.website || ""}
                      placeholder="https://example.com"
                    />
                    {actionData?.errors?.website && (
                      <p className="text-sm text-red-500">{actionData.errors.website[0]}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      name="location"
                      defaultValue={profile.location || ""}
                      placeholder="Yangon, Myanmar"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-4">Tip: Phone and Email will open your dialer or mail app. Location uses Google Maps.</p>
              </CardContent>
           </Card>
        </fetcher.Form>

        {/* Right Column - Branding & Links */}
        <div className="space-y-6">
           {/* Branding Card */}
           <Card>
              <CardHeader>
                <CardTitle className="text-base">Branding</CardTitle>
                <CardDescription>Choose your theme colors.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <div className="flex gap-2">
                      <div className="relative w-10 h-10 rounded-md overflow-hidden border shadow-sm">
                        <input
                          type="color"
                          id="primaryColor"
                          name="primaryColor"
                          form="profile-form"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="absolute -top-2 -left-2 w-16 h-16 p-0 border-0 cursor-pointer"
                        />
                      </div>
                      <Input
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="flex-1 uppercase font-mono"
                        maxLength={7}
                        form="profile-form"
                        name="primaryColor"
                      />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="secondaryColor">Secondary Color (Teal)</Label>
                    <div className="flex gap-2">
                      <div className="relative w-10 h-10 rounded-md overflow-hidden border shadow-sm">
                        <input
                          type="color"
                          id="secondaryColor"
                          name="secondaryColor"
                          form="profile-form"
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="absolute -top-2 -left-2 w-16 h-16 p-0 border-0 cursor-pointer"
                        />
                      </div>
                      <Input
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="flex-1 uppercase font-mono"
                        maxLength={7}
                        form="profile-form"
                        name="secondaryColor"
                      />
                    </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-3">Preview on card:</p>
                  <div className="w-full aspect-[3/4] rounded-xl overflow-hidden shadow-lg border bg-white flex flex-col items-center relative">
                      {/* Header Background */}
                      <div className="w-full h-32" style={{ backgroundColor: primaryColor }}></div>
                      {/* Avatar */}
                      <div className="absolute top-20 w-24 h-24 rounded-full border-4 border-white bg-slate-100 overflow-hidden">
                         <Avatar className="w-full h-full">
                           <AvatarImage src={profile.avatarUrl || ""} />
                           <AvatarFallback>{(profile.displayName || profile.user.name || "U").charAt(0)}</AvatarFallback>
                         </Avatar>
                      </div>
                      {/* Content */}
                      <div className="mt-14 w-full px-6 text-center space-y-2">
                          <div className="font-bold text-lg">{profile.displayName || profile.user.name || "Your Name"}</div>
                          <div className="text-sm text-muted-foreground">{profile.bio || "Your Bio"}</div>
                          
                          <div className="mt-6">
                             <div className="h-10 rounded-md w-full flex items-center justify-center text-white font-medium" style={{ backgroundColor: secondaryColor }}>
                                Connect
                             </div>
                          </div>
                      </div>
                  </div>
                </div>
              </CardContent>
           </Card>

           {/* Social & Custom Links */}
           <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                      <CardTitle className="text-base">Links</CardTitle>
                      <CardDescription>Social media & websites.</CardDescription>
                  </div>
                  <LinkAddDialog />
              </CardHeader>
              <CardContent>
                  <div className="space-y-3">
                      {profile.links.map((link) => (
                      <div key={link.id} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                          <div className="grid grid-cols-1 gap-1 flex-1 mr-4 overflow-hidden">
                               <div className="font-medium text-sm truncate">{link.title}</div>
                               <div className="text-xs text-muted-foreground truncate font-mono">{link.url}</div>
                          </div>
                          <fetcher.Form method="post">
                            <input type="hidden" name="intent" value="delete-link" />
                            <input type="hidden" name="linkId" value={link.id} />
                            <Button variant="ghost" size="icon" type="submit" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                          </fetcher.Form>
                      </div>
                      ))}
                      
                      {profile.links.length === 0 && (
                      <div className="text-center py-6 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                          No links added yet.
                      </div>
                      )}
                  </div>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}

function LinkAddDialog() {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                    <Plus className="mr-2 h-4 w-4" /> Add Link
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Link</DialogTitle>
                    <DialogDescription>Add a social profile or custom link to your card.</DialogDescription>
                </DialogHeader>
                <LinkAddForm onSuccess={() => setOpen(false)} />
            </DialogContent>
        </Dialog>
    );
}

function LinkAddForm({ onSuccess }: { onSuccess: () => void }) {
    const fetcher = useFetcher<{ success?: boolean }>();
    const isSubmitting = fetcher.state === "submitting";

    useEffect(() => {
        if (fetcher.state === "idle" && fetcher.data?.success) {
            onSuccess();
        }
    }, [fetcher.state, fetcher.data, onSuccess]);

    return (
        <fetcher.Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="add-link" />
            <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" placeholder="e.g. Facebook, Portfolio" required />
            </div>
            <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input id="url" name="url" placeholder="https://..." required />
            </div>
            <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Adding..." : "Add Link"}
                </Button>
            </DialogFooter>
        </fetcher.Form>
    );
}

export { RouteErrorBoundary as ErrorBoundary };
