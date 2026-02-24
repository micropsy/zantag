import { isRouteErrorResponse, useRouteError } from "@remix-run/react";

export function RouteErrorBoundary() {
  const error = useRouteError();

  let title = "Something went wrong";
  let message = "An unexpected error occurred. Please try again.";
  let status: number | undefined;

  if (isRouteErrorResponse(error)) {
    status = error.status;
    title = error.statusText || title;
    try {
      // Try to read a JSON error body if present
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = error.data;
      if (data?.error && typeof data.error === "string") {
        message = data.error;
      } else if (typeof data === "string") {
        message = data;
      }
    } catch {
      // ignore parse issues and fall back to defaults
    }
  } else if (error instanceof Error) {
    message = error.message || message;
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white shadow-sm rounded-2xl border border-slate-200 p-8 text-center space-y-4">
        <div className="inline-flex items-center justify-center rounded-full bg-rose-50 text-rose-600 w-10 h-10 text-sm font-semibold mb-2">
          !
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-slate-900">
            {status ? `${status} – ${title}` : title}
          </h1>
          <p className="text-sm text-slate-600 whitespace-pre-line">{message}</p>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          If this keeps happening, please contact support.
        </p>
      </div>
    </div>
  );
}

