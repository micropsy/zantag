// @ts-nocheck
import { createPagesFunctionHandler } from "@remix-run/cloudflare-pages";
import * as build from "../build/server";

// @ts-ignore - the build file is generated at runtime
export const onRequest = async (context) => {
  // Fix for "Host header does not match origin header" error in local dev
  // This happens because Wrangler might set Host header differently than the Origin in some proxy setups
  // We'll normalize the Host header to match the Origin if we're in dev mode
  
  const url = new URL(context.request.url);
  const request = context.request;
  const origin = request.headers.get("Origin");
  const host = request.headers.get("Host");

  // Handle Vite client requests to prevent errors
  if (url.pathname.startsWith("/@vite/client")) {
    return new Response(null, { status: 404 });
  }

  // Force Host header fix for all non-GET requests or when Origin is present
  if (origin && (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]")) {
    const originUrl = new URL(origin);
    
    if (host !== originUrl.host) {
        const newHeaders = new Headers(request.headers);
        newHeaders.set("Host", originUrl.host);
        newHeaders.set("X-Forwarded-Host", originUrl.host);
        
        const newRequest = new Request(request, {
            headers: newHeaders,
            // Preserve other properties
            method: request.method,
            redirect: request.redirect,
            // Pass body only if not GET/HEAD to avoid errors
            body: (request.method !== 'GET' && request.method !== 'HEAD') ? request.body : null,
        });
        
        context.request = newRequest;
    }
  }

  return createPagesFunctionHandler({
    build,
    getLoadContext: (context) => {
      return {
        cloudflare: {
          env: context.env,
          cf: context.request.cf || ({} as any),
          ctx: {
            waitUntil: context.waitUntil,
            passThroughOnException: context.passThroughOnException,
          } as any,
        },
      };
    },
  })(context);
};
