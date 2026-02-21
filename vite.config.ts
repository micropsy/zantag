import {
  vitePlugin as remix,
  cloudflareDevProxyVitePlugin as remixCloudflareDevProxy,
} from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    remixCloudflareDevProxy(),
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_lazyRouteDiscovery: true,
        v3_singleFetch: true,
      },
    }),
    tsconfigPaths(),
  ],
  ssr: {
    external: ["node:crypto", "node:stream", "node:events", "node:path", "node:buffer", "node:util", "node:string_decoder", "node:process"],
    noExternal: ["googleapis", "google-auth-library", "gaxios", "gtoken", "gcp-metadata"],
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      onwarn(warning, defaultHandler) {
        if (warning.code === 'EMPTY_BUNDLE') return;
        defaultHandler(warning);
      },
    },
  },
});
