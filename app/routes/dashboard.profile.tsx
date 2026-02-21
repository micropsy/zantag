import { json, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { useEffect } from "react";
import { getDb } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2, Link as LinkIcon } from "lucide-react";
import { RouteErrorBoundary } from "~/components/RouteErrorBoundary";

import { profileSchema } from "~/utils/schemas";

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request);
  const db = getDb(context);

  const profile = await db.profile.findUnique({
    where: { userId },
    include: {
      links: true,
    },
  });

  if (!profile) {
    return redirect("/dashboard");
  }

  return json({ profile });
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
    };

    const result = profileSchema.safeParse(rawData);
    if (!result.success) {
      return json({ 
        success: false, 
        errors: result.error.flatten().fieldErrors 
      }, { status: 400 });
    }

    const { displayName, username, bio, primaryColor, secondaryColor } = result.data;

    // Check username uniqueness if changed
    if (username && username !== existingProfile.username) {
      const taken = await db.profile.findUnique({
        where: { username },
      });
      if (taken) {
        return json({ 
          success: false, 
          errors: { username: ["Username is already taken"] } 
        }, { status: 400 });
      }
    }

    await db.profile.update({
      where: { id: existingProfile.id },
      data: { 
        displayName, 
        bio,
        username: username || undefined,
        primaryColor: primaryColor || undefined,
        secondaryColor: secondaryColor || undefined
      },
    });

    return json({ success: true });
  }

  if (intent === "add-link") {
    const title = formData.get("title") as string;
    const url = formData.get("url") as string;
    const type = formData.get("type") as string;

    await db.link.create({
      data: {
        profileId: existingProfile.id,
        title,
        url,
        type,
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

import { PageHeader } from "~/components/ui/page-header";

export default function DashboardProfile() {
  const { profile } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === "submitting";

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

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Profile" 
        description="Manage your public profile information." 
      />

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
          </CardHeader>
          <CardContent>
            <fetcher.Form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="update-profile" />
              
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  name="displayName"
                  defaultValue={profile.displayName || ""}
                  placeholder="John Doe"
                  className={actionData?.errors?.displayName ? "border-red-500" : ""}
                />
                {actionData?.errors?.displayName && (
                  <p className="text-sm text-red-500">{actionData.errors.displayName[0]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username / Slug</Label>
                <Input
                  id="username"
                  name="username"
                  defaultValue={profile.username || ""}
                  placeholder="johndoe"
                  className={actionData?.errors?.username ? "border-red-500" : ""}
                />
                {actionData?.errors?.username && (
                  <p className="text-sm text-red-500">{actionData.errors.username[0]}</p>
                )}
                <p className="text-xs text-muted-foreground">This is your public URL: zantag.com/p/username</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      id="primaryColor"
                      name="primaryColor"
                      defaultValue={profile.primaryColor || "#0F172A"}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={profile.primaryColor || "#0F172A"}
                      readOnly
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      id="secondaryColor"
                      name="secondaryColor"
                      defaultValue={profile.secondaryColor || "#06B6D4"}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={profile.secondaryColor || "#06B6D4"}
                      readOnly
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  defaultValue={profile.bio || ""}
                  placeholder="Tell us about yourself"
                />
              </div>

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </fetcher.Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Links</CardTitle>
            <Button variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" /> Add Link
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {profile.links.map((link) => (
                <div key={link.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-muted rounded-md">
                      <LinkIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{link.title}</p>
                      <p className="text-sm text-muted-foreground">{link.url}</p>
                    </div>
                  </div>
                  <fetcher.Form method="post">
                    <input type="hidden" name="intent" value="delete-link" />
                    <input type="hidden" name="linkId" value={link.id} />
                    <Button variant="ghost" size="icon" type="submit">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </fetcher.Form>
                </div>
              ))}
              
              {profile.links.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  No links added yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export { RouteErrorBoundary as ErrorBoundary };
