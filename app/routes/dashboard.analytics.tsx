import { json, redirect, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { getDb } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Users, Eye, MousePointer2 } from "lucide-react";

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request, context);
  const db = getDb(context);

  const profile = await db.profile.findUnique({
    where: { userId },
    include: {
      contacts: {
        orderBy: { createdAt: 'desc' },
        take: 5 // Get recent 5 leads for activity feed
      },
      _count: {
        select: {
          contacts: true,
          documents: true,
          links: true
        }
      }
    }
  });

  if (!profile) {
    return redirect("/dashboard");
  }

  // Calculate monthly leads
  // Since we only fetched 5 contacts above, we need a separate aggregation for the chart if we want full history
  // But for now let's just do a simple aggregation of all contacts if needed, or just stick to total counts.
  // To get the chart data properly, we should fetch all contacts timestamps.
  const allContacts = await db.contact.findMany({
    where: { profileId: profile.id },
    select: { createdAt: true }
  });

  const leadsByMonth = allContacts.reduce((acc: Record<string, number>, contact) => {
    const date = new Date(contact.createdAt);
    const month = date.toLocaleString('default', { month: 'short' });
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(leadsByMonth).map(([name, total]) => ({ name, total }));

  return json({ 
    stats: {
      totalLeads: profile._count.contacts,
      totalDocuments: profile._count.documents,
      totalLinks: profile._count.links,
      views: 124, // Mock data for now as we don't track views yet
    },
    recentLeads: profile.contacts,
    chartData
  });
};

import { PageHeader } from "~/components/ui/page-header";

export default function DashboardAnalytics() {
  const { stats, recentLeads, chartData } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Analytics" 
        description="Track your profile performance and lead generation." 
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLeads}</div>
            <p className="text-xs text-muted-foreground">
              +20.1% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profile Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.views}</div>
            <p className="text-xs text-muted-foreground">
              +15% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileTextIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">
              Active resources
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Links</CardTitle>
            <MousePointer2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLinks}</div>
            <p className="text-xs text-muted-foreground">
              Clickable elements
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>
              Lead generation over the last few months.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[200px] w-full flex items-center justify-center bg-muted/20 rounded-md border border-dashed">
                {chartData.length > 0 ? (
                    <div className="flex items-end gap-2 h-[150px] px-4 w-full justify-around">
                        {chartData.map((data, i) => (
                            <div key={i} className="flex flex-col items-center gap-2">
                                <div 
                                    className="w-8 bg-primary rounded-t-sm transition-all hover:bg-primary/80" 
                                    style={{ height: `${Math.max(10, Math.min(100, (data.total / 10) * 100))}%` }}
                                ></div>
                                <span className="text-xs text-muted-foreground">{data.name}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground text-sm">No data available yet</p>
                )}
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest interactions with your profile.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
                {recentLeads.length > 0 ? (
                    recentLeads.map((lead) => (
                        <div key={lead.id} className="flex items-center">
                            <div className="space-y-1">
                                <p className="text-sm font-medium leading-none">{lead.name}</p>
                                <p className="text-sm text-muted-foreground">{lead.email}</p>
                            </div>
                            <div className="ml-auto font-medium text-xs text-muted-foreground">
                                {new Date(lead.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground">No recent activity.</p>
                )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FileTextIcon(props: React.ComponentProps<"svg">) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" x2="8" y1="13" y2="13" />
        <line x1="16" x2="8" y1="17" y2="17" />
        <line x1="10" x2="8" y1="9" y2="9" />
      </svg>
    )
  }


