import { type LoaderFunction } from "@remix-run/cloudflare";

export const loader: LoaderFunction = () => {
  return new Response("self.addEventListener('install', () => self.skipWaiting()); self.addEventListener('activate', () => self.clients.claim());", {
    status: 200,
    headers: {
      "Content-Type": "application/javascript",
    },
  });
};
