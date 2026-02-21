import { type LoaderFunctionArgs, json } from "@remix-run/cloudflare";
import { Outlet, useLoaderData } from "@remix-run/react";
import { Sidebar } from "~/components/dashboard/Sidebar";
import { MobileNav } from "~/components/dashboard/MobileNav";
import { Toaster } from "~/components/ui/sonner";
import { requireAdmin } from "~/utils/session.server";
import { RouteErrorBoundary } from "~/components/RouteErrorBoundary";

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const user = await requireAdmin(request, context);
  
  if (!user) {
    throw new Response("User not found", { status: 404 });
  }

  return json({ user });
};

export default function AdminLayout() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-slate-50 font-inter">
      <Sidebar user={user} />
      <main className="md:ml-64 min-h-screen pb-20 md:pb-0">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
      <MobileNav />
      <Toaster />
    </div>
  );
}

export { RouteErrorBoundary as ErrorBoundary };
