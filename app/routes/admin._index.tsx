import { type LoaderFunctionArgs, json } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { getDb } from "~/utils/db.server";
import { requireAdmin } from "~/utils/session.server";
import { UserRole } from "~/types";
import { AdminUserTable } from "~/components/admin/AdminUserTable";
import { AdminCompanyTable } from "~/components/admin/AdminCompanyTable";
import { InvitationManager } from "~/components/admin/InvitationManager";
import { SystemConfig } from "~/components/admin/SystemConfig";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { RouteErrorBoundary } from "~/components/RouteErrorBoundary";

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const currentUser = await requireAdmin(request, context);
  const db = getDb(context);

  // Fetch users for AdminUserTable
  // Only SUPER_ADMIN can see all users, BUSINESS_ADMIN sees their staff?
  // For now, let's assume SUPER_ADMIN sees all, BUSINESS_ADMIN sees nothing or limited.
  // The AdminUserTable component seems designed for SUPER_ADMIN user management.
  
  let users: { id: string; name: string | null; email: string; role: string }[] = [];
  let organizations: { id: string; name: string; slug: string; admin: { id: string; name: string | null; email: string } | null }[] = [];
  let admins: { id: string; name: string | null; email: string; role: string }[] = [];

  if (currentUser.role === UserRole.SUPER_ADMIN) {
    users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    organizations = await db.organization.findMany({
      include: {
        admin: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    
    admins = users.filter(u => u.role === UserRole.BUSINESS_ADMIN || u.role === UserRole.SUPER_ADMIN);
  }

  // Fetch invite codes (REMOVED: InvitationManager fetches its own data)
  // const inviteCodes = await db.inviteCode.findMany({
  //   orderBy: { createdAt: "desc" },
  // });

  return json({ 
    userRole: currentUser.role,
    users,
    organizations,
    admins,
    // inviteCodes
  });
};

export default function AdminDashboard() {
  const { userRole, users, organizations, admins } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
        <p className="text-muted-foreground">
          Manage users, organizations, and system settings.
        </p>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
          <TabsTrigger value="settings">System Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="space-y-4">
            <AdminUserTable users={users} />
        </TabsContent>
        
        <TabsContent value="organizations" className="space-y-4">
            <AdminCompanyTable initial={organizations} admins={admins} />
        </TabsContent>
        
        <TabsContent value="invitations" className="space-y-4">
            <InvitationManager user={{ role: userRole }} />
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-4">
            <SystemConfig user={{ role: userRole }} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export { RouteErrorBoundary as ErrorBoundary };
