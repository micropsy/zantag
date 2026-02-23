/* eslint-disable @typescript-eslint/no-explicit-any */
import { json, redirect, type LoaderFunctionArgs, type ActionFunctionArgs, unstable_parseMultipartFormData, type UploadHandler, unstable_composeUploadHandlers, unstable_createMemoryUploadHandler } from "@remix-run/cloudflare";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { useEffect, useState, useRef } from "react";
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
import { Trash2, Link as LinkIcon, Save, Check, X, Loader2, Phone, Mail, Globe, MapPin, Building, User, Image as ImageIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ImageCropper } from "~/components/image-cropper";

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request, context);
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

  return json({ profile, domainUrl, env: { R2_PUBLIC_URL: context.cloudflare.env.R2_PUBLIC_URL } });
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const userId = await requireUserId(request, context);
  const db = getDb(context);
  const bucket = context.cloudflare.env.BUCKET;
  const r2PublicUrl = context.cloudflare.env.R2_PUBLIC_URL;

  // Verify profile ownership
  const existingProfile = await db.profile.findUnique({
    where: { userId },
    include: { user: { select: { shortCode: true } } },
  });

  if (!existingProfile) {
    return json({ error: "Profile not found" }, { status: 404 });
  }

  // Custom Upload Handler for R2
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const uploadHandler: UploadHandler = async ({ name, filename, data, contentType }) => {
    if ((name !== "avatar" && name !== "banner") || !filename) {
      return undefined;
    }

    const chunks = [];
    for await (const chunk of data) {
      chunks.push(chunk);
    }
    const buffer = await new Blob(chunks as any).arrayBuffer();
    
    // Generate key using shortCode: {shortCode}/profile_{shortCode}.png or {shortCode}/banner_{shortCode}.png
    // We enforce .png extension as requested
    const shortCode = existingProfile.user.shortCode;
    const key = `${shortCode}/${name === "avatar" ? "profile" : "banner"}_${shortCode}.png`;
    
    if (bucket) {
      await bucket.put(key, buffer, {
        httpMetadata: { contentType: "image/png" } // Enforce PNG content type since we save as .png
      });
      // Return the full public URL if configured, otherwise use the local resource route
      // Append timestamp for cache busting
      const baseUrl = r2PublicUrl ? `${r2PublicUrl}/${key}` : `/images/${key}`;
      return `${baseUrl}?v=${Date.now()}`;
    } else {
      console.error("R2 Bucket binding 'BUCKET' is missing in context.cloudflare.env");
    }
    
    return undefined;
  };

  // Compose handlers: try R2 first, then memory fallback (though we only want R2 for files)
  const compoundHandler = unstable_composeUploadHandlers(
    uploadHandler,
    unstable_createMemoryUploadHandler()
  );

  const formData = await unstable_parseMultipartFormData(request, compoundHandler);
  const intent = formData.get("intent");

  if (intent === "update-profile") {
    // 1. Handle Basic Fields
    const rawData = {
      displayName: formData.get("displayName") as string,
      username: formData.get("username") as string,
      bio: formData.get("bio") as string,
      position: formData.get("position") as string,
      department: formData.get("department") as string,
      companyName: formData.get("companyName") as string,
      primaryColor: formData.get("primaryColor") as string,
      secondaryColor: formData.get("secondaryColor") as string,
    };

    // 2. Handle File Uploads
    const avatarEntry = formData.get("avatar");
    const bannerEntry = formData.get("banner");
    
    // Ensure we only get strings (URLs from upload handler) not File objects
    const avatarUrl = typeof avatarEntry === "string" ? avatarEntry : undefined;
    const bannerUrl = typeof bannerEntry === "string" ? bannerEntry : undefined;
    
    const deleteBanner = formData.get("deleteBanner") === "true";

    // Handle Banner Deletion from R2
    if (deleteBanner && bucket) {
      const shortCode = existingProfile.user.shortCode;
      const key = `${shortCode}/banner_${shortCode}.png`;
      try {
        await bucket.delete(key);
      } catch (error) {
        console.error("Failed to delete banner from R2", error);
      }
    }

    // 3. Handle Contact Links (JSON)
    const linksDataRaw = formData.get("linksData") as string;
    let linksData: any[] = [];
    try {
      linksData = JSON.parse(linksDataRaw || "[]");
    } catch (e) {
      console.error("Failed to parse links data", e);
    }

    // Validate Basic Fields
    // We relax schema validation here since we added new fields manually
    const username = rawData.username;

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

    // Update Profile
    await db.profile.update({
      where: { id: existingProfile.id },
      data: {
        displayName: rawData.displayName as string || undefined,
        username: rawData.username as string || undefined,
        bio: rawData.bio as string || null,
        position: rawData.position as string || null,
        department: rawData.department as string || null,
        companyName: rawData.companyName as string || null,
        primaryColor: rawData.primaryColor as string || undefined,
        avatarUrl: avatarUrl, // Will be undefined if not string (i.e. not uploaded)
        bannerUrl: deleteBanner ? null : bannerUrl,
      } as any,
    });

    // Sync Links
    // Strategy: Delete all PHONE, EMAIL, WEBSITE, LOCATION links for this profile
    // Then create new ones from the list. 
    // This is safer than trying to diff updates for now.
    
    const contactTypes = ["PHONE", "EMAIL", "WEBSITE", "LOCATION"];
    
    // Delete existing contact links
    await db.link.deleteMany({
      where: {
        profileId: existingProfile.id,
        type: { in: contactTypes }
      }
    });

    // Create new links
    if (linksData.length > 0) {
      await db.link.createMany({
        data: linksData.map((link: any) => ({
          profileId: existingProfile.id,
          title: link.title || link.type, // e.g. "Work Phone"
          url: link.url,
          type: link.type,
          category: link.category || "PERSONAL",
          icon: link.icon
        }))
      });
    }

    return json({ success: true });
  }

  return json({ error: "Invalid intent" }, { status: 400 });
};

export default function DashboardProfile() {
  const data = useLoaderData<typeof loader>() as any;
  const { profile, domainUrl } = data;
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === "submitting";
  
  // -- State --
  const [username, setUsername] = useState(profile.username);
  const [debouncedUsername, setDebouncedUsername] = useState(username);
  
  // Content State for Preview
  const [displayName, setDisplayName] = useState(profile.displayName || profile.user.name || "");
  const [position, setPosition] = useState(profile.position || "");
  const [department, setDepartment] = useState(profile.department || "");
  const [companyName, setCompanyName] = useState(profile.companyName || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [primaryColor, setPrimaryColor] = useState(profile.primaryColor || "#0F172A");
  const [secondaryColor, setSecondaryColor] = useState(profile.secondaryColor || "#06B6D4");
  
  // File Previews
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatarUrl);
  const [bannerPreview, setBannerPreview] = useState<string | null>(profile.bannerUrl);

  // Cropping State
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [croppingImage, setCroppingImage] = useState<string | null>(null);
  const [cropType, setCropType] = useState<"avatar" | "banner">("avatar");
  const [croppedAvatar, setCroppedAvatar] = useState<Blob | null>(null);
  const [croppedBanner, setCroppedBanner] = useState<Blob | null>(null);

  // Initialize links state from loaded data
  const [links, setLinks] = useState<any[]>(profile.links || []);
  const [activeTab, setActiveTab] = useState<"OFFICE" | "PERSONAL">("OFFICE");
  const [previewTab, setPreviewTab] = useState<"OFFICE" | "PERSONAL">("OFFICE");

  // Username Validation Logic
  const usernameFetcher = useFetcher<{ available: boolean; message: string }>();
  const lastCheckedUsernameRef = useRef<string | null>(null);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUsername(username);
    }, 500);
    return () => clearTimeout(timer);
  }, [username]);

  useEffect(() => {
    // Only check if:
    // 1. Username is valid length
    // 2. Different from current profile username
    // 3. Different from last checked username (to prevent loops)
    if (
      debouncedUsername && 
      debouncedUsername.length >= 3 && 
      debouncedUsername !== profile.username &&
      debouncedUsername !== lastCheckedUsernameRef.current
    ) {
      lastCheckedUsernameRef.current = debouncedUsername;
      usernameFetcher.load(`/api/check-username?username=${debouncedUsername}`);
    }
  }, [debouncedUsername, profile.username, usernameFetcher]);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
  };
  
  const isUsernameChecking = usernameFetcher.state !== "idle";

  // File Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "avatar" | "banner") => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCroppingImage(reader.result as string);
        setCropType(type);
        setCropModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
    // Clear input value to allow re-selecting same file
    e.target.value = "";
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    const url = URL.createObjectURL(croppedBlob);
    if (cropType === "avatar") {
      setAvatarPreview(url);
      setCroppedAvatar(croppedBlob);
    } else {
      setBannerPreview(url);
      setCroppedBanner(croppedBlob);
    }
    setCropModalOpen(false);
    setCroppingImage(null);
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Append cropped files if they exist
    if (croppedAvatar) {
      formData.set("avatar", croppedAvatar, "avatar.png");
    }
    if (croppedBanner) {
      formData.set("banner", croppedBanner, "banner.png");
    }

    fetcher.submit(formData, { method: "post", encType: "multipart/form-data" });
  };

  // Link Handlers
  const addLink = (type: string) => {
    const newLink = {
      id: `temp-${Date.now()}`,
      title: "",
      url: "",
      type,
      category: activeTab,
    };
    setLinks([...links, newLink]);
  };

  const removeLink = (id: string) => {
    setLinks(links.filter(l => l.id !== id));
  };

  const updateLink = (id: string, field: string, value: string) => {
    setLinks(links.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "PHONE": return <Phone className="h-4 w-4" />;
      case "EMAIL": return <Mail className="h-4 w-4" />;
      case "WEBSITE": return <Globe className="h-4 w-4" />;
      case "LOCATION": return <MapPin className="h-4 w-4" />;
      default: return <LinkIcon className="h-4 w-4" />;
    }
  };

  const getPlaceholder = (type: string) => {
    switch (type) {
      case "PHONE": return "+959...";
      case "EMAIL": return "example@mail.com";
      case "WEBSITE": return "https://...";
      case "LOCATION": return "City, Country";
      default: return "Value";
    }
  };

  const actionData = fetcher.data as { success?: boolean; errors?: Record<string, string[]> };

  useEffect(() => {
    if (fetcher.state === "idle" && actionData?.success) {
      toast.success("Profile updated successfully");
    } else if (actionData?.errors) {
      toast.error("Please fix the errors below");
    }
  }, [actionData, fetcher.state]);

  const isUsernameValid = usernameFetcher.data?.available;
  const usernameMessage = usernameFetcher.data?.message;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Profile</h1>
          <p className="text-muted-foreground">Customize your personal or business card.</p>
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
        {/* Main Form */}
        <fetcher.Form 
          method="post" 
          id="profile-form" 
          onSubmit={handleFormSubmit}
          className="lg:col-span-2 space-y-6"
          encType="multipart/form-data"
        >
           <input type="hidden" name="intent" value="update-profile" />
           <input type="hidden" name="linksData" value={JSON.stringify(links)} />
           <input type="hidden" name="deleteBanner" value={(!bannerPreview).toString()} />
           
           {/* Visual Identity (Banner & Avatar) */}
           <Card className="overflow-hidden">
              <div className="relative h-40 bg-muted group/banner">
                {bannerPreview ? (
                  <>
                    <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 opacity-100 md:opacity-0 md:group-hover/banner:opacity-100 transition-opacity z-10 h-8 w-8"
                      onClick={() => {
                        setBannerPreview(null);
                        // We also need to clear the file input if any
                        const input = document.getElementById('banner-upload') as HTMLInputElement;
                        if (input) input.value = '';
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-slate-100">
                    <ImageIcon className="h-8 w-8 opacity-20 mb-2" />
                    <span className="text-xs opacity-50">Recommended: 600 x 200 px</span>
                  </div>
                )}
                
                {!bannerPreview && (
                  <div className="absolute top-2 right-2">
                    <Label htmlFor="banner-upload" className="cursor-pointer bg-black/50 hover:bg-black/70 text-white p-2 rounded-md transition-colors flex items-center gap-2 text-xs">
                      <ImageIcon className="h-4 w-4" /> Add Banner
                    </Label>
                    <Input 
                      id="banner-upload" 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleFileChange(e, "banner")} 
                    />
                  </div>
                )}
              </div>
              
              <div className="px-6 pb-6 relative">
                <div className="relative -top-12 mb-[-30px] flex items-end">
                   <div className="relative flex flex-col items-center">
                     <div className="relative">
                       <Avatar className="w-24 h-24 border-4 border-white bg-white shadow-sm">
                         <AvatarImage src={avatarPreview || ""} />
                         <AvatarFallback className="text-xl">{displayName?.[0] || "U"}</AvatarFallback>
                       </Avatar>
                       <Label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-1.5 rounded-full cursor-pointer hover:bg-primary/90 border-2 border-white shadow-sm">
                          <ImageIcon className="h-3 w-3" />
                       </Label>
                       <Input 
                          id="avatar-upload" 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => handleFileChange(e, "avatar")} 
                        />
                     </div>
                     <p className="text-[10px] text-muted-foreground text-center mt-2 bg-white/80 px-2 py-0.5 rounded-full backdrop-blur-sm border shadow-sm">
                        Recommended: 400 x 400 px
                     </p>
                   </div>
                </div>
              </div>
           </Card>

           {/* Basic Information */}
           <Card>
              <CardHeader>
                <CardTitle className="text-base">Basic Information</CardTitle>
                <CardDescription>Details about your role and identity.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      name="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position">Position / Job Title</Label>
                    <Input
                      id="position"
                      name="position"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      placeholder="e.g. Senior Manager"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      name="department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g. Sales & Marketing"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      name="companyName"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Acme Corp"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                    className="min-h-[100px]"
                  />
                </div>
              </CardContent>
           </Card>

           {/* Contact Information (Redesigned) */}
           <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact Information</CardTitle>
                <CardDescription>Manage your contact details for work and personal use.</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs 
                  value={activeTab} 
                  onValueChange={(v) => setActiveTab(v as "OFFICE" | "PERSONAL")} 
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="OFFICE" className="flex items-center gap-2">
                      <Building className="h-4 w-4" /> Office Contact
                    </TabsTrigger>
                    <TabsTrigger value="PERSONAL" className="flex items-center gap-2">
                      <User className="h-4 w-4" /> Personal Contact
                    </TabsTrigger>
                  </TabsList>
                  
                  {/* Toolbar to Add Items */}
                  <div className="flex gap-2 mb-6 p-2 bg-muted/50 rounded-lg justify-center overflow-x-auto">
                    <Button type="button" variant="outline" size="sm" onClick={() => addLink("PHONE")} className="gap-2">
                      <Phone className="h-4 w-4" /> Phone
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => addLink("EMAIL")} className="gap-2">
                      <Mail className="h-4 w-4" /> Email
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => addLink("WEBSITE")} className="gap-2">
                      <Globe className="h-4 w-4" /> Website
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => addLink("LOCATION")} className="gap-2">
                      <MapPin className="h-4 w-4" /> Location
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {links.filter(l => l.category === activeTab).length === 0 && (
                       <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                          No {activeTab.toLowerCase()} contacts added yet.
                          <br />Click the buttons above to add one.
                       </div>
                    )}

                    {links.filter(l => l.category === activeTab).map((link: any) => (
                      <div key={link.id} className="flex items-start gap-2 group animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="mt-2.5 text-muted-foreground">
                          {getIcon(link.type)}
                        </div>
                        <div className="flex-1 space-y-2">
                           <div className="flex gap-2">
                             <Input 
                               value={link.title || ""} 
                               onChange={(e) => updateLink(link.id, "title", e.target.value)}
                               placeholder={`${link.type} Label (Optional)`}
                               className="w-1/3 text-xs h-8"
                             />
                             <Input 
                               value={link.url} 
                               onChange={(e) => updateLink(link.id, "url", e.target.value)}
                               placeholder={getPlaceholder(link.type)}
                               className="flex-1 h-8"
                             />
                           </div>
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeLink(link.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                </Tabs>
              </CardContent>
           </Card>

           {/* Public Profile URL Settings & Theme Colors */}
           <Card>
              <CardHeader>
                <CardTitle className="text-base">Profile Settings</CardTitle>
                <CardDescription>Customize your public profile appearance and URL.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile URL */}
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-xs font-medium uppercase text-muted-foreground">Custom URL</Label>
                  <div className="flex rounded-md shadow-sm relative">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm select-none">
                      {domainUrl.replace(/^https?:\/\//, "")}/user/
                    </span>
                    <Input
                      id="username"
                      name="username"
                      value={username}
                      onChange={handleUsernameChange}
                      className="rounded-l-none"
                    />
                    <div className="absolute right-3 top-2.5">
                       {isUsernameChecking && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                       {!isUsernameChecking && username !== profile.username && isUsernameValid && <Check className="h-4 w-4 text-green-500" />}
                       {!isUsernameChecking && username !== profile.username && isUsernameValid === false && <X className="h-4 w-4 text-red-500" />}
                    </div>
                  </div>
                  {usernameMessage && (
                    <p className={`text-sm ${isUsernameValid ? "text-green-600" : "text-red-500"}`}>{usernameMessage}</p>
                  )}
                  
                  {/* Permanent Link Display */}
                  <div className="mt-2 pt-2 border-t">
                    <Label className="text-xs font-medium uppercase text-muted-foreground mb-1.5 block">Permanent Link (Always Works)</Label>
                    <div className="flex gap-2">
                      <code className="flex-1 bg-muted p-2 rounded text-xs font-mono break-all border text-emerald-600">
                        {domainUrl}/c/{profile.user.shortCode}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(`${domainUrl}/c/${profile.user.shortCode}`);
                          toast.success("Link copied to clipboard");
                        }}
                      >
                        Copy
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <a href={`/c/${profile.user.shortCode}`} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                       Use this link for physical NFC cards. It will never change even if you update your Custom URL.
                    </p>
                  </div>
                </div>

                {/* Theme Colors (Moved here) */}
                <div className="space-y-4 pt-4 border-t">
                    <Label className="text-xs font-medium uppercase text-muted-foreground">Theme Colors</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Primary Color */}
                      <div className="space-y-2">
                        <Label className="text-sm">Primary Color</Label>
                        <div className="flex gap-2">
                          <div className="relative w-10 h-10 rounded-md overflow-hidden border shadow-sm">
                            <input
                              type="color"
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

                      {/* Secondary Color */}
                      <div className="space-y-2">
                        <Label className="text-sm">Secondary Color (Teal)</Label>
                        <div className="flex gap-2">
                          <div className="relative w-10 h-10 rounded-md overflow-hidden border shadow-sm">
                            <input
                              type="color"
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
                    </div>
                </div>
              </CardContent>
           </Card>
        </fetcher.Form>

        {/* Right Column - Preview & Branding */}
        <div className="space-y-6">
           <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-base">Live Preview</CardTitle>
                <CardDescription>See how it looks on mobile.</CardDescription>
              </CardHeader>
              <CardContent>
                  <div className="w-full aspect-[9/19] rounded-[2rem] overflow-hidden shadow-2xl border-4 border-slate-900 bg-slate-100 flex flex-col relative max-w-[320px] mx-auto transform scale-90 sm:scale-100 transition-transform">
                      
                      {/* Mobile Preview Content */}
                      <div className="flex-1 overflow-y-auto scrollbar-hide bg-slate-50">
                        {/* Banner */}
                        <div className="h-28 bg-slate-900 relative shrink-0" style={{ backgroundColor: !bannerPreview ? primaryColor : undefined }}>
                          {bannerPreview && <img src={bannerPreview} alt="Mobile Banner" className="w-full h-full object-cover" />}
                        </div>
                        
                        {/* Header */}
                        <div className="px-4 relative shrink-0">
                          <div className="flex justify-between items-end -mt-10 mb-2">
                             <Avatar className="w-20 h-20 border-4 border-white bg-white shadow-sm">
                               <AvatarImage src={avatarPreview || ""} />
                               <AvatarFallback>{displayName?.[0] || "U"}</AvatarFallback>
                             </Avatar>
                          </div>
                          
                          <div className="space-y-1 mb-4">
                             <h3 className="font-bold text-lg leading-tight text-slate-900 line-clamp-2">{displayName || "Your Name"}</h3>
                             
                             {(position || department) && (
                               <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs font-medium text-slate-600">
                                 {position && <span>{position}</span>}
                                 {position && department && <span className="text-slate-300">•</span>}
                                 {department && <span>{department}</span>}
                               </div>
                             )}
                             
                             {companyName && (
                               <p className="text-xs text-slate-500 flex items-start gap-1.5 pt-0.5">
                                 <Building className="h-3 w-3 mt-0.5 shrink-0" style={{ color: secondaryColor }} /> 
                                 <span className="line-clamp-2 leading-snug">{companyName}</span>
                               </p>
                             )}
                          </div>

                          {/* Action Buttons Mock */}
                          <div className="grid grid-cols-2 gap-2 mb-4">
                             <div className="bg-slate-900 h-8 rounded-md flex items-center justify-center text-white text-xs font-medium shadow-sm" style={{ backgroundColor: primaryColor }}>
                               Save Contact
                             </div>
                             <div className="bg-white border h-8 rounded-md flex items-center justify-center text-slate-700 text-xs font-medium shadow-sm" style={{ color: secondaryColor, borderColor: secondaryColor }}>
                               Connect
                             </div>
                          </div>

                          {/* Bio */}
                          {bio && (
                            <div className="mb-4 p-3 bg-white rounded-lg border border-slate-100 text-[10px] text-slate-600 leading-relaxed shadow-sm">
                               {bio}
                            </div>
                          )}

                          {/* Tabs Mock */}
                          <div className="mb-4">
                             <div className="flex bg-slate-200/50 p-1 rounded-lg mb-3">
                                <button 
                                  type="button"
                                  onClick={() => setPreviewTab("OFFICE")}
                                  className={`flex-1 py-1.5 text-[10px] font-medium rounded-md flex items-center justify-center gap-1 transition-all ${previewTab === "OFFICE" ? "bg-white shadow-sm" : "text-muted-foreground"}`}
                                  style={previewTab === "OFFICE" ? { color: primaryColor } : {}}
                                >
                                  <Building className="h-3 w-3" /> Office
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => setPreviewTab("PERSONAL")}
                                  className={`flex-1 py-1.5 text-[10px] font-medium rounded-md flex items-center justify-center gap-1 transition-all ${previewTab === "PERSONAL" ? "bg-white shadow-sm" : "text-muted-foreground"}`}
                                  style={previewTab === "PERSONAL" ? { color: primaryColor } : {}}
                                >
                                  <User className="h-3 w-3" /> Personal
                                </button>
                             </div>

                             <div className="space-y-2">
                                {links.filter(l => (l.category || "PERSONAL") === previewTab).length === 0 ? (
                                  <div className="text-center py-4 text-xs text-muted-foreground">No contacts</div>
                                ) : (
                                  links.filter(l => (l.category || "PERSONAL") === previewTab).map(l => (
                                    <div key={l.id} className="flex items-center p-2 rounded-lg bg-white border border-slate-100 shadow-sm">
                                       <div className="bg-slate-50 p-1.5 rounded-full mr-2 text-slate-500" style={{ color: secondaryColor }}>
                                          {getIcon(l.type)}
                                       </div>
                                       <div className="flex-1 min-w-0">
                                          {l.title && <p className="text-[9px] text-muted-foreground font-bold uppercase">{l.title}</p>}
                                          <p className="text-[10px] font-medium text-slate-900 truncate">{l.url}</p>
                                       </div>
                                    </div>
                                  ))
                                )}
                             </div>
                          </div>
                        </div>
                      </div>

                      {/* Phone Footer */}
                      <div className="h-1 bg-slate-900 mx-auto w-1/3 rounded-full my-2 opacity-20"></div>
                  </div>
              </CardContent>
           </Card>
           
           {/* Theme Colors - MOVED TO PROFILE SETTINGS CARD */}
        </div>
      </div>

      <ImageCropper
        open={cropModalOpen}
        imageSrc={croppingImage}
        aspect={cropType === "avatar" ? 1 : 3} // Avatar 1:1, Banner 3:1
        cropShape={cropType === "avatar" ? "round" : "rect"}
        onCancel={() => {
          setCropModalOpen(false);
          setCroppingImage(null);
        }}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}
