import { isRouteErrorResponse, useRouteError, Link } from "@remix-run/react";
import { AlertTriangle } from "lucide-react";

export function RouteErrorBoundary() {
  const error = useRouteError();
  
  let title = "Something went wrong";
  let message = "An unexpected error occurred.";

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    message = error.data as string;
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-white rounded-lg border border-slate-200 shadow-sm m-4">
      <div className="bg-rose-50 p-4 rounded-full mb-4">
        <AlertTriangle className="w-10 h-10 text-rose-600" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">{title}</h2>
      <p className="text-slate-500 max-w-md mb-6">{message}</p>
      <div className="flex gap-4">
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors font-medium"
        >
          Try Again
        </button>
        <Link
          to="/dashboard"
          className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors font-medium"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
