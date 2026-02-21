/// <reference types="@remix-run/dev" />
/// <reference types="@remix-run/cloudflare" />
/// <reference types="@cloudflare/workers-types" />
/// <reference types="vite/client" />

import "@remix-run/server-runtime";

declare global {
  interface Env {
    DB: D1Database;
    BUCKET: R2Bucket;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    GOOGLE_REFRESH_TOKEN: string;
    GOOGLE_REDIRECT_URI: string;
    EMAIL_USER: string;
    INVITE_CODE_SECRET: string;
    RESEND_API_KEY: string;
    EMAIL_FROM: string;
    APP_URL: string;
    SESSION_SECRET: string;
    PUBLIC_ASSETS_URL?: string;
  }
}

declare module "@remix-run/cloudflare" {
  interface AppLoadContext {
    cloudflare: {
      env: Env;
      cf: CfProperties;
      ctx: ExecutionContext;
    };
  }
}
