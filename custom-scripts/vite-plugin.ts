import type { Plugin } from "vite";
import { resolveCustomPath } from "./path-resolver";

export function customResolverPlugin(): Plugin {
  return {
    name: "custom-resolver",
    enforce: "pre",
    apply: () => true,
    buildStart() {
      console.log(
        `🔧 [custom-resolver] Plugin initialized in ${process.env.NODE_ENV} mode`
      );
    },
    resolveId(id: string, importer?: string) {
      if (
        id.startsWith("virtual:") ||
        id.startsWith("\0") ||
        id.startsWith("node:")
      ) {
        return null;
      }
      if (id.includes("node_modules")) {
        return null;
      }

      if (!importer) {
        return null;
      }

      const projectRoot = process.env.NUXT_ROOT_DIR || process.cwd();
      return resolveCustomPath(id, importer, { projectRoot });
    },
  };
}
