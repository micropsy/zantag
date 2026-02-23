// @ts-nocheck
import { createPagesFunctionHandler } from "@remix-run/cloudflare-pages";
import * as build from "../build/server";

// @ts-ignore - the build file is generated at runtime
export const onRequest = async (context) => {
  // Fix for "Host header does not match origin header" error in local dev
  // This happens because Wrangler might set Host header differently than the Origin in some proxy setups
  // We'll normalize the Host header to match the Origin if we're in dev mode
  
  if (context.env.NODE_ENV !== "production") {
    const request = context.request;
    const origin = request.headers.get("Origin");
    
    if (origin) {
      const url = new URL(request.url);
      const originUrl = new URL(origin);
      
      // If we are on localhost, let's try to be lenient
      if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
         // Clone the request to modify headers
         const newHeaders = new Headers(request.headers);
         // Set Host to match the URL host, which should match Origin host in local dev
         newHeaders.set("Host", url.host); 
         
         const newRequest = new Request(request, {
           headers: newHeaders
         });
         
         // Replace the request in context
         context.request = newRequest;
      }
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
