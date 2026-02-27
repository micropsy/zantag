import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { redirect } from "@remix-run/cloudflare";
import { useFetcher, Form, useLoaderData } from "@remix-run/react";
import { useEffect, useRef } from "react";
import { getDb } from "~/utils/db.server";
import { requireUserId, sessionStorage } from "~/utils/session.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { toast } from "sonner";
import { Lock, LogOut, Mail, User } from "lucide-react";
import { compare, hash } from "bcrypt-ts";
import { RouteErrorBoundary } from "~/components/RouteErrorBoundary";
import { getSession } from "~/utils/session.server";

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request, context);
  const db = getDb(context);
  
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
    }
  });

  if (!user) {
    throw new Response("User not found", { status: 404 });
  }

  return json({ user });
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const userId = await requireUserId(request, context);
  const db = getDb(context);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete-account") {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { 
        profile: true,
        organizationsAdmin: true
      }
    });

    if (!user) {
      return json({ error: "User not found" }, { status: 404 });
    }

    // Business Admin Checks
    if (user.role === "BUSINESS_ADMIN") {
      const companyId = user.profile?.companyId;
      
      if (companyId) {
        // Check for other admins in the same company
        const otherAdmins = await db.profile.findMany({
          where: {
            companyId: companyId,
            user: {
              role: "BUSINESS_ADMIN",
              id: { not: userId } // Exclude current user
            }
          },
          include: {
            user: true
          }
        });

        if (otherAdmins.length === 0) {
          return json({ 
            error: "Cannot delete account. You are the only Business Admin for this organization. Please assign another admin before deleting your account." 
          }, { status: 400 });
        }

        // If this user is the owner (adminId) of the organization, transfer ownership
        // We check organizationsAdmin array which contains orgs where this user is adminId
        if (user.organizationsAdmin.length > 0) {
          const newAdminId = otherAdmins[0].userId; // Pick the first available admin
          
          for (const org of user.organizationsAdmin) {
            await db.organization.update({
              where: { id: org.id },
              data: { adminId: newAdminId }
            });
          }
        }
      }
    }

    if (user.role === "INDIVIDUAL" && user.profileId) {
      try {
        // Note: R2 folder deletion is handled separately or not needed for settings
      } catch (error) {
        console.error("Failed to delete R2 folder:", error);
      }
    }

    // Clean up non-cascading relations
    try {
      await db.inviteCode.deleteMany({
        where: { userId: userId }
      });
    } catch (error) {
      console.error("Failed to delete invite codes:", error);
    }

    // D1 Deletion Logic
    // This will cascade delete Profile, Links, etc.
    await db.user.delete({
      where: { id: userId }
    });

    // Logout
    const session = await getSession(request, context);
    return redirect("/", {
      headers: {
        "Set-Cookie": await sessionStorage.destroySession(session),
      },
    });
  }

  if (intent === "change-password") {
    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return json({ error: "All fields are required" }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return json({ error: "New passwords do not match" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return json({ error: "User not found" }, { status: 404 });
    }

    const isValid = await compare(currentPassword, user.password);

    if (!isValid) {
      return json({ error: "Incorrect current password" }, { status: 400 });
    }

    const hashedPassword = await hash(newPassword, 10);

    await db.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return json({ success: true });
  }

  if (intent === "update-profile") {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;

    if (!name || !email) {
      return json({ error: "Name and email are required" }, { status: 400 });
    }

    const nameValue = name.trim();
    const emailValue = email.trim().toLowerCase();

    // Check if email is already taken by another user
    const existingUser = await db.user.findFirst({
      where: {
        email: emailValue,
        id: { not: userId }
      }
    });

    if (existingUser) {
      return json({ error: "Email is already in use by another account" }, { status: 400 });
    }

    // Update user profile
    await db.user.update({
      where: { id: userId },
      data: {
        name: nameValue,
        email: emailValue,
      },
    });

    return json({ success: true, message: "Profile updated successfully" });
  }

  if (intent === "connect-google") {
    // For now, return a placeholder response
    // In production, this would initiate OAuth flow
    return json({ 
      success: true, 
      message: "Google account linking would be implemented here",
      needsOAuth: true 
    });
  }

  return json({ error: "Invalid intent" }, { status: 400 });
};

import { PageHeader } from "~/components/ui/page-header";

export default function DashboardSettings() {
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === "submitting";
  const formRef = useRef<HTMLFormElement>(null);
  const profileFormRef = useRef<HTMLFormElement>(null);
  const { user } = useLoaderData<typeof loader>();

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = fetcher.data as any;
    if (fetcher.state === "idle" && data) {
      if (data.success) {
        toast.success("Password updated successfully");
        if (formRef.current) {
          formRef.current.reset();
        }
      } else if (data && data.error) {
        toast.error(data.error);
      }
    }
  }, [fetcher.data, fetcher.state]);

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    formData.append("intent", "update-profile");
    fetcher.submit(formData, { method: "post" });
  };

  const handleGoogleConnect = () => {
    const googleAuthUrl = new URL("/auth/google", window.location.origin);
    window.location.href = googleAuthUrl.toString();
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Settings" 
        description="Manage your account settings and preferences." 
      />

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Update your personal information and email address.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form ref={profileFormRef} onSubmit={handleProfileSubmit} className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    defaultValue={user.name || ""}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={user.email}
                    className="pl-9"
                    required
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Your email will be used for login and notifications.
                </p>
              </div>

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update Profile"}
              </Button>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>
              Update your password to keep your account secure.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <fetcher.Form method="post" ref={formRef} className="space-y-4 max-w-md">
              <input type="hidden" name="intent" value="change-password" />
              
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update Password"}
              </Button>
            </fetcher.Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connected Accounts</CardTitle>
            <CardDescription>
              Link your Google account for easier sign-in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              type="button" 
              variant="outline" 
              className="w-full max-w-md"
              onClick={handleGoogleConnect}
              disabled={isSubmitting}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20px" height="20px" className="mr-2 h-4 w-4">
                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,8,3.029V10.18c-3.448-3.337-8.06-5.337-13-5.337c-11.045,0-20,8.955-20,20c0,11.045,8.955,20,20,20c11.045,0,19.119-8.174,19.119-19.22c0-1.181-0.104-1.942-0.247-2.907z" />
                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,8,3.029V10.18C28.06,6.843,23.447,4.843,18.447,4.843C11.045,4.843,4.956,10.119,4.956,17.119C4.956,19.22,5.247,20.083,5.247,20.083H6.306z" />
                <path fill="#4CAF50" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,8,3.029V10.18c-3.448-3.337-8.06-5.337-13-5.337c-11.045,0-20,8.955-20,20c0,11.045,8.955,20,20,20c11.045,0,19.119-8.174,19.119-19.22c0-1.181-0.104-1.942-0.247-2.907z" />
                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,8,3.029V10.18c-3.448-3.337-8.06-5.337-13-5.337c-11.045,0-20,8.955-20,20c0,11.045,8.955,20,20,20c11.045,0,19.119-8.174,19.119-19.22c0-1.181-0.104-1.942-0.247-2.907z" />
              </svg>
              Connect with Google
            </Button>
            <p className="text-xs text-slate-500 mt-2">
              Google account linking will be implemented here with OAuth flow.
            </p>
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <LogOut className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription className="text-destructive/80">
              Once you delete your account, there is no going back. Please be certain.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form method="post" onSubmit={(e) => {
              if (!confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
                e.preventDefault();
              }
            }}>
              <input type="hidden" name="intent" value="delete-account" />
              <Button 
                variant="destructive" 
                type="submit"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Delete Account
              </Button>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export { RouteErrorBoundary as ErrorBoundary };
