import { resolve, dirname, extname, relative } from "path";
import { existsSync, statSync } from "fs";

export interface ResolveOptions {
  projectRoot?: string;
  extensions?: string[];
}

const DEFAULT_EXTENSIONS = [".ts", ".js", ".tsx", ".jsx", ".vue"];

function getOriginalImporterPath(importerPath: string, customDir: string, projectRoot: string): string {
  const normalizedImporter = importerPath.replace(/\\/g, '/');
  const normalizedCustomDir = customDir.replace(/\\/g, '/');
  
  if (normalizedImporter.startsWith(normalizedCustomDir)) {
    const relativePath = relative(customDir, importerPath);
    const originalPath = resolve(projectRoot, relativePath);
    return originalPath;
  }
  return importerPath;
}

function findFileWithExtension(basePath: string, extensions: string[], excludePath?: string): string | null {
  for (const ext of extensions) {
    const pathWithExt = basePath + ext;
    if (existsSync(pathWithExt)) {
      if (excludePath && resolve(pathWithExt) === resolve(excludePath)) {
        continue;
      }
      return pathWithExt;
    }
  }
  return null;
}

function findIndexFile(dirPath: string, extensions: string[]): string | null {
  if (!existsSync(dirPath)) {
    return null;
  }
  
  const stat = statSync(dirPath);
  if (!stat.isDirectory()) {
    return null;
  }

  for (const ext of extensions) {
    const indexPath = resolve(dirPath, `index${ext}`);
    if (existsSync(indexPath)) {
      return indexPath;
    }
  }
  
  return null;
}

export function resolveCustomPath(
  moduleName: string,
  importer: string,
  options: ResolveOptions = {},
): string | null {
  const projectRoot = options.projectRoot || process.env.NUXT_ROOT_DIR || process.cwd();
  const extensions = options.extensions || DEFAULT_EXTENSIONS;
  const customDir = resolve(projectRoot, "custom");

  if (!moduleName || !importer) {
    return null;
  }

  if (importer.includes(".nuxt")) {
    return null;
  }

  const isAbsolutePath = /^[A-Z]:/i.test(moduleName) || moduleName.startsWith("/");
  const isRelativeOrAlias =
    moduleName.startsWith(".") || moduleName.startsWith("~") || moduleName.startsWith("@");

  if (!isAbsolutePath && !isRelativeOrAlias) {
    return null;
  }

  let resolvedPath: string;

  if (moduleName.startsWith("./") || moduleName.startsWith("../")) {
    const originalImporter = getOriginalImporterPath(importer, customDir, projectRoot);
    resolvedPath = resolve(dirname(originalImporter), moduleName);
  } else if (moduleName.startsWith("/") && !isAbsolutePath) {
    resolvedPath = resolve(projectRoot, moduleName.slice(1));
  } else if (moduleName.startsWith("~/") || moduleName.startsWith("@/")) {
    const pathWithoutAlias = moduleName.slice(2);
    resolvedPath = resolve(projectRoot, pathWithoutAlias);
  } else if (isAbsolutePath) {
    resolvedPath = moduleName;
  } else {
    return null;
  }

  let actualResolvedPath = resolvedPath;

  if (!extname(resolvedPath)) {
    const fileWithExt = findFileWithExtension(resolvedPath, extensions, importer);
    if (fileWithExt) {
      actualResolvedPath = fileWithExt;
    } else {
      const indexFile = findIndexFile(resolvedPath, extensions);
      if (indexFile) {
        actualResolvedPath = indexFile;
      }
    }
  }

  const relativePath = relative(projectRoot, actualResolvedPath);
  const customPath = resolve(projectRoot, "custom", relativePath);

  if (!existsSync(actualResolvedPath)) {
    if (existsSync(customPath)) {
      const customStat = statSync(customPath);
      if (customStat.isFile()) {
        return customPath;
      }
      
      if (customStat.isDirectory()) {
        const customIndexFile = findIndexFile(customPath, extensions);
        if (customIndexFile) {
          return customIndexFile;
        }
      }
    }

    const customPathWithoutExt = extname(customPath)
      ? customPath.slice(0, -extname(customPath).length)
      : customPath;

    const customFileWithExt = findFileWithExtension(customPathWithoutExt, extensions);
    if (customFileWithExt) {
      return customFileWithExt;
    }

    return null;
  }

  if (existsSync(customPath)) {
    const customStat = statSync(customPath);
    if (customStat.isFile()) {
      return customPath;
    }
    
    if (customStat.isDirectory()) {
      const customIndexFile = findIndexFile(customPath, extensions);
      if (customIndexFile) {
        return customIndexFile;
      }
    }
  }

  const customPathWithoutExt = extname(customPath)
    ? customPath.slice(0, -extname(customPath).length)
    : customPath;

  const customFileWithExt = findFileWithExtension(customPathWithoutExt, extensions);
  if (customFileWithExt) {
    return customFileWithExt;
  }

  if (existsSync(actualResolvedPath)) {
    const stat = statSync(actualResolvedPath);
    if (stat.isFile()) {
      return actualResolvedPath;
    }
  }

  return null;
}
