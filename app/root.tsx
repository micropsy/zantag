import type { LinksFunction, MetaFunction } from "@remix-run/cloudflare";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError,
} from "@remix-run/react";
import { Toaster } from "sonner";
import styles from "./styles/tailwind.css?url";

export const meta: MetaFunction = () => {
  return [
    { title: "ZanTag" },
    { charset: "utf-8" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
  ];
};

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: styles },
  { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
  { rel: "shortcut icon", type: "image/x-icon", href: "/favicon.ico" },
  { rel: "apple-touch-icon", href: "/logo.png" },
];

export default function App() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <Toaster richColors position="top-center" />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Oh no!</title>
        <Meta />
        <Links />
      </head>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-900 p-4">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-2xl w-full border border-slate-200">
            <h1 className="text-3xl font-bold text-rose-600 mb-4">Application Error</h1>
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
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors"
            >
              Go Home
            </a>
          </div>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
