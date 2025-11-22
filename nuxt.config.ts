import { existsSync } from "fs";
import { resolve } from "path";
import type { NuxtConfig } from "nuxt/schema";
import { customResolverPlugin } from "./custom-scripts/vite-plugin";

export default defineNuxtConfig({
  experimental: {
    renderJsonPayloads: false,
  },
  ssr: true,
  runtimeConfig: {
    public: {
      baseApiUrl: "/api/",
      domain: process.env.DOMAIN_URL || "",
      host: process.env.HOST,
    },
  },
  devtools: { enabled: true },

  typescript: {
    tsConfig: {
      compilerOptions: {
        plugins: [
          {
            name: "typescript-custom-resolver-plugin"
          }
        ]
      },
    }
  },

  components: [
    {
      path: "~/components",
      extensions: [".vue"],
    },
  ],

  build: { transpile: ["@vee-validate/rules"] },

  vite: {
    plugins: [customResolverPlugin()],
    optimizeDeps: {
      exclude: ["@resvg/resvg-js", "fsevents"],
    },
    server: {
      watch: {
        usePolling: true,
      },
    },
  },

  nitro: {
    rollupConfig: {
      plugins: [customResolverPlugin()],
    },
  },

  imports: {
    dirs: [
      "utils/**",
      "store/**",
      "types/**",
      "app/modules/**",
      "composables/**",
    ],
  },

  pages: true,
});
