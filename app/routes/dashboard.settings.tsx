import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { redirect } from "@remix-run/cloudflare";
import { useFetcher, Form } from "@remix-run/react";
import { useEffect, useRef } from "react";
import { getDb } from "~/utils/db.server";
import { requireUserId, sessionStorage } from "~/utils/session.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { toast } from "sonner";
import { Lock, LogOut } from "lucide-react";
import { compare, hash } from "bcrypt-ts";
import { RouteErrorBoundary } from "~/components/RouteErrorBoundary";

import { deleteUserFolder } from "~/services/storage.server";
import { getSession } from "~/utils/session.server";

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  await requireUserId(request, context);
  return json({});
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  console.log("Settings action started");
  const userId = await requireUserId(request, context);
  const db = getDb(context);
  const formData = await request.formData();
  const intent = formData.get("intent");
  console.log(`Settings action intent: ${intent}`);

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
            console.log(`Transferred ownership of organization ${org.id} to user ${newAdminId}`);
          }
        }
      }
    }

    // R2 Deletion Logic
    // Only delete R2 folder if user is INDIVIDUAL
    if (user.role === "INDIVIDUAL" && user.shortCode) {
      try {
        await deleteUserFolder(context, user.shortCode);
        console.log(`Deleted R2 folder for user ${user.shortCode}`);
      } catch (error) {
        console.error("Failed to delete R2 folder:", error);
      }
    } else {
      console.log(`Skipping R2 deletion for user ${user.id} with role ${user.role}`);
    }

    // Clean up non-cascading relations
    try {
      await db.inviteCode.deleteMany({
        where: { userId: userId }
      });
      console.log("Deleted associated invite codes");
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
      console.log("Missing password fields");
      return json({ error: "All fields are required" }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      console.log("New passwords do not match");
      return json({ error: "New passwords do not match" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      console.log("Password too short");
      return json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      console.log("User not found for password change");
      return json({ error: "User not found" }, { status: 404 });
    }

    console.log("Verifying current password...");
    const isValid = await compare(currentPassword, user.password);
    console.log(`Current password valid: ${isValid}`);

    if (!isValid) {
      return json({ error: "Incorrect current password" }, { status: 400 });
    }

    const hashedPassword = await hash(newPassword, 10);
    console.log("Hashing new password and updating DB...");

    await db.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
    console.log("Password updated successfully");

    return json({ success: true });
  }

  return json({ error: "Invalid intent" }, { status: 400 });
};

import { PageHeader } from "~/components/ui/page-header";

export default function DashboardSettings() {
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === "submitting";
  const formRef = useRef<HTMLFormElement>(null);

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

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Settings" 
        description="Manage your account settings and preferences." 
      />

      <div className="grid gap-6">
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
