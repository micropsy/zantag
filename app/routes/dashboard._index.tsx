import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, Link, isRouteErrorResponse, useRouteError } from "@remix-run/react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "~/components/ui/card";
import { Users, Eye, FileText, TrendingUp, LayoutDashboard } from "lucide-react";
import { getDb } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request);
  const db = getDb(context);
  
  const profile = await db.profile.findUnique({
    where: { userId },
    include: {
      contacts: {
        orderBy: { createdAt: 'desc' },
        take: 5
      },
      _count: {
        select: {
          contacts: true,
          documents: true,
        }
      }
    }
  });

  return json({ profile });
};

export function ErrorBoundary() {
  const error = useRouteError();
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
      <div className="bg-rose-50 p-4 rounded-full">
        <LayoutDashboard className="w-10 h-10 text-rose-600" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">Unable to load dashboard</h2>
      <p className="text-slate-500 max-w-sm">
        {isRouteErrorResponse(error) 
          ? `${error.status} ${error.statusText}`
          : error instanceof Error 
            ? error.message 
            : "An unexpected error occurred."}
      </p>
    </div>
  );
}

export default function DashboardIndex() {
  const { profile } = useLoaderData<typeof loader>();

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center">
        <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center">
          <LayoutDashboard className="w-10 h-10 text-teal-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">Welcome to ZanTag!</h2>
          <p className="text-slate-500 max-w-sm">Let&apos;s get your professional digital presence started.</p>
        </div>
        
        <Link 
          to="/setup" 
          className="inline-flex items-center justify-center px-6 py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors shadow-lg shadow-teal-600/20"
        >
          Setup your Profile
        </Link>

        <div className="grid gap-4 w-full max-w-md mt-8">
          <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold">1</div>
            <p className="font-medium text-slate-700">Setup your digital profile</p>
          </div>
          <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm opacity-50">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold">2</div>
            <p className="font-medium text-slate-700">Add your social links</p>
          </div>
          <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm opacity-50">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold">3</div>
            <p className="font-medium text-slate-700">Share your QR code</p>
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: "Total Leads",
      value: profile._count.contacts.toString(),
      icon: Users,
      color: "text-teal-600",
      bg: "bg-teal-50",
      description: "People who reached out",
    },
    {
      title: "Profile Views",
      value: profile.views.toString(),
      icon: Eye,
      color: "text-blue-600",
      bg: "bg-blue-50",
      description: "Total profile visits",
    },
    {
      title: "Documents",
      value: profile._count.documents.toString(),
      icon: FileText,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      description: "Shared resources",
    },
    {
      title: "Conversion",
      value: profile.views > 0 
        ? `${((profile._count.contacts / profile.views) * 100).toFixed(1)}%`
        : "0%",
      icon: TrendingUp,
      color: "text-rose-600",
      bg: "bg-rose-50",
      description: "Profile to lead ratio",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h2>
        <p className="text-slate-500">Overview of your digital card performance</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              <p className="text-xs text-slate-500 mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Leads Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Recent Leads</CardTitle>
            <CardDescription>
              You made {profile._count.contacts} connections this month.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {profile.contacts.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No leads yet. Share your profile to get started!
              </div>
            ) : (
              <div className="space-y-4">
                  {profile.contacts.map((contact) => (
                      <div key={contact.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                          <div>
                              <p className="font-medium text-slate-900">{contact.name}</p>
                              <p className="text-sm text-slate-500">{contact.email || "No email"}</p>
                          </div>
                          <div className="text-sm text-slate-400">
                              {new Date(contact.createdAt).toLocaleDateString()}
                          </div>
                      </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
