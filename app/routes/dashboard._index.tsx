import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, Link, isRouteErrorResponse, useRouteError } from "@remix-run/react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "~/components/ui/card";
import { 
  Users, 
  Eye, 
  FileText, 
  TrendingUp, 
  LayoutDashboard,
  Plus,
  ArrowUpRight,
  Upload,
  QrCode
} from "lucide-react";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { getDb } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";
import { getDomainUrl } from "~/utils/helpers";

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request);
  const db = getDb(context);
  const domainUrl = getDomainUrl(request, context);
  
  const profile = await db.profile.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          role: true,
        }
      },
      company: {
        select: {
          slug: true,
        }
      },
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

  return json({ 
    profile,
    views: 124, // Mock data
    domainUrl
  });
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

import { PageHeader } from "~/components/ui/page-header";

export default function DashboardIndex() {
  const { profile, views, domainUrl } = useLoaderData<typeof loader>();

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
      value: views.toString(),
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
      value: views > 0 
        ? `${((profile._count.contacts / views) * 100).toFixed(1)}%`
        : "0%",
      icon: TrendingUp,
      color: "text-rose-600",
      bg: "bg-rose-50",
      description: "Profile to lead ratio",
    },
  ];

  // Safely access user name or fallback to displayName or generic
  // profile object structure: { ...profileFields, user: { name: string, email: string } }
  const userName = profile.user?.name || profile.displayName || "there";

  // Calculate profile URL
  // Use Master Link (Custom Username) as primary
  const profileUrl = `${domainUrl}/user/${profile.username}`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader 
        title={`Welcome back, ${userName}!`}
        description="Here's what's happening with your digital business card."
      />

      {/* Stats Grid */}
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

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        {/* Recent Leads - Spans 2 columns */}
        <Card className="col-span-1 lg:col-span-2 border-slate-200 shadow-sm h-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold">Recent Leads</CardTitle>
              <CardDescription>
                People who recently contacted you.
              </CardDescription>
            </div>
            <Link to="/dashboard/leads" className="text-sm font-medium text-teal-600 hover:text-teal-700">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {profile.contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
                <Users className="w-12 h-12 mb-4 text-slate-300" />
                <p>No leads yet.</p>
                <p className="text-sm">Share your profile to start connecting!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {profile.contacts.map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10 border border-slate-200">
                        <AvatarFallback className="bg-white text-slate-600 font-medium">
                          {contact.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-slate-900">{contact.name}</p>
                        <p className="text-sm text-slate-500">{contact.email || "No email provided"}</p>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 font-medium">
                      {new Date(contact.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions - Spans 1 column */}
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Quick Actions</CardTitle>
              <CardDescription>
                Common tasks you might want to do.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/dashboard/profile" className="block">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-teal-50 hover:bg-teal-100 transition-colors border border-teal-100 group cursor-pointer">
                  <div className="p-2 bg-teal-100 rounded-md text-teal-600 group-hover:bg-teal-200 transition-colors">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="font-medium text-teal-900">Edit Profile</span>
                </div>
              </Link>
              
              <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="block">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-100 group cursor-pointer">
                  <div className="p-2 bg-blue-100 rounded-md text-blue-600 group-hover:bg-blue-200 transition-colors">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                  <span className="font-medium text-blue-900">View Public Card</span>
                </div>
              </a>

              <Link to="/dashboard/documents" className="block">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors border border-indigo-100 group cursor-pointer">
                  <div className="p-2 bg-indigo-100 rounded-md text-indigo-600 group-hover:bg-indigo-200 transition-colors">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="font-medium text-indigo-900">Upload Resources</span>
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Pro Tip Card */}
          <div className="bg-slate-900 rounded-xl p-6 text-white shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <QrCode className="w-24 h-24 transform rotate-12 translate-x-4 -translate-y-4" />
            </div>
            <div className="relative z-10">
              <p className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Pro Tip</p>
              <p className="font-medium leading-relaxed">
                Add your ZanTag QR code to your phone&apos;s wallet for instant sharing!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
