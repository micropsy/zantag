import { type LoaderFunctionArgs, json } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { useEffect, useState } from "react";
import { getDb } from "~/utils/db.server";
import { requireAdmin } from "~/utils/session.server";
import { UserRole } from "~/types";
import { AdminUserTable } from "~/components/admin/AdminUserTable";
import { AdminCompanyTable } from "~/components/admin/AdminCompanyTable";
import { InvitationManager } from "~/components/admin/InvitationManager";
import { SystemConfig } from "~/components/admin/SystemConfig";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
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
          <TabsTrigger value="cards">Invites &amp; Cards</TabsTrigger>
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

        <TabsContent value="cards" className="space-y-4">
          <CardManagement userRole={userRole} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type CardRecord = {
  profileId: string;
  createdAt: string;
};

function CardManagement({ userRole }: { userRole: string }) {
  const [singleProfileId, setSingleProfileId] = useState("");
  const [amount, setAmount] = useState(50);
  const [cards, setCards] = useState<CardRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isSuperAdmin = userRole === UserRole.SUPER_ADMIN;

  const loadCards = async () => {
    if (!isSuperAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users?intent=card-list");
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error || "Failed to load cards");
        return;
      }
      const data = (await res.json()) as { profileId: string; createdAt: string }[];
      setCards(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSingleCreate = async () => {
    if (!singleProfileId.trim()) {
      setError("profileId is required");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "card-single",
          profileId: singleProfileId.trim(),
        }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string; success?: boolean } | null;
      if (!res.ok || !body?.success) {
        setError(body?.error || "Failed to create card");
        return;
      }
      setSingleProfileId("");
      setSuccess("Card created successfully");
      await loadCards();
    } finally {
      setLoading(false);
    }
  };

  const handleBulkCreate = async () => {
    if (!amount || amount <= 0) {
      setError("Amount must be a positive number");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "card-bulk",
          amount,
        }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string; success?: boolean } | null;
      if (!res.ok || !body?.success) {
        setError(body?.error || "Failed to generate cards");
        return;
      }
      setSuccess("Cards generated successfully");
      await loadCards();
    } finally {
      setLoading(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <Card className="border-none shadow-sm bg-white/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Invites &amp; Cards</CardTitle>
          <CardDescription>Only SUPER_ADMIN users can manage card batches.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm bg-white/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Invite &amp; Card Management</CardTitle>
          <CardDescription>
            Create single or bulk profile IDs for NFC cards, and export unactivated IDs for printing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-emerald-600">{success}</p>}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">Single Entry</h3>
              <p className="text-sm text-slate-500">
                Manually enter a profile ID (for example, a phone number) to pre-create a card.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  placeholder="Enter profileId (e.g. phone number)"
                  value={singleProfileId}
                  onChange={(e) => setSingleProfileId(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleSingleCreate} disabled={loading}>
                  Create
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">Bulk Generation</h3>
              <p className="text-sm text-slate-500">
                Generate a batch of random 8-character profile IDs for printing on cards.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-32"
                />
                <Button onClick={handleBulkCreate} disabled={loading}>
                  Generate
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm bg-white/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Unactivated Profile IDs</CardTitle>
          <CardDescription>
            These IDs are not activated yet. Use this list when printing physical cards.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Total unactivated cards: {cards.length}</span>
            <Button size="sm" variant="outline" onClick={loadCards} disabled={loading}>
              Refresh
            </Button>
          </div>
          {cards.length === 0 ? (
            <p className="text-sm text-slate-500">No unactivated profile IDs yet.</p>
          ) : (
            <div className="space-y-3">
              <div className="max-h-64 overflow-y-auto border rounded-md bg-slate-50">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="px-3 py-2 text-left">profileId</th>
                      <th className="px-3 py-2 text-left">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cards.map((c) => (
                      <tr key={c.profileId} className="border-t">
                        <td className="px-3 py-1 font-mono text-[11px]">{c.profileId}</td>
                        <td className="px-3 py-1 text-slate-500">
                          {new Date(c.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-slate-500">
                  Raw list (one per line) for quick copy and export:
                </p>
                <textarea
                  readOnly
                  className="w-full h-32 text-xs font-mono border rounded-md bg-slate-50 p-2"
                  value={cards.map((c) => c.profileId).join("\n")}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export { RouteErrorBoundary as ErrorBoundary };
