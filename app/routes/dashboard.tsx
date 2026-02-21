import { type LoaderFunctionArgs, json, redirect } from "@remix-run/cloudflare";
import { Outlet, useLoaderData, isRouteErrorResponse, useRouteError } from "@remix-run/react";
import { Sidebar } from "~/components/dashboard/Sidebar";
import { MobileNav } from "~/components/dashboard/MobileNav";
import { Toaster } from "~/components/ui/sonner";
import { requireUser } from "~/utils/session.server";

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const user = await requireUser(request, context);

  if (!user.isEmailVerified) {
    return redirect(`/verify-sent?email=${user.email}`);
  }

  if (!user.profile) {
    return redirect("/setup");
  }

  return json({ user });
};

export function ErrorBoundary() {
  const error = useRouteError();
  console.error(error);
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-900 p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-2xl w-full border border-slate-200">
        <h1 className="text-3xl font-bold text-rose-600 mb-4">Dashboard Error</h1>
        <div className="bg-slate-100 p-4 rounded-md overflow-auto max-h-96 font-mono text-sm mb-6 border border-slate-200">
          {isRouteErrorResponse(error) ? (
            <>
              <p className="font-bold text-lg mb-2">{error.status} {error.statusText}</p>
              <p>{error.data}</p>
            </>
          ) : error instanceof Error ? (
            <>
              <p className="font-bold text-lg mb-2">{error.message}</p>
              <pre>{error.stack}</pre>
            </>
          ) : (
            <p>Unknown Error</p>
          )}
        </div>
        <a 
          href="/login"
          className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors"
        >
          Back to Login
        </a>
      </div>
    </div>
  );
}

export default function DashboardLayout() {
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
