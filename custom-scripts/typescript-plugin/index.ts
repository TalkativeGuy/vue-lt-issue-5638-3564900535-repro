import { resolve, relative, dirname } from "path";
import type * as ts from "typescript/lib/tsserverlibrary";
import { resolveCustomPath } from "../path-resolver";

function init(modules: {
  typescript: typeof import("typescript/lib/tsserverlibrary");
}) {
  const ts = modules.typescript;

  function create(info: ts.server.PluginCreateInfo): ts.LanguageService {
    const logger = info.project.projectService.logger;
    
    logger.info("[TS-Plugin] create() called");

    logger.info("[TS-Plugin] Plugin loaded. Root files:");
    logger.info(JSON.stringify(info.project.getRootFiles(), null, 2));
    logger.info("[TS-Plugin] LanguageServiceHost: " + Object.keys(info.languageServiceHost).join(', '));
    logger.info("[TS-Plugin] projectName: " + info.project.getProjectName());
    logger.info("[TS-Plugin] projectKind: " + ts.server.ProjectKind[info.project.projectKind]);
    
    const isResolveModuleNamePatched = Symbol('__isResolveModuleNamePatched__');
    const host = info.languageServiceHost;
    const project = info.project;

    if (!(info.languageServiceHost as any)?.[isResolveModuleNamePatched]) {
      logger.info("[TS-Plugin] Attempting to patch all resolve methods in create()");

      function resolveAndMaybeRewrite(
        moduleName: string,
        containingFile: string,
        options: ts.CompilerOptions,
        originalResult: ts.ResolvedModuleWithFailedLookupLocations | undefined
      ): ts.ResolvedModuleWithFailedLookupLocations | undefined {
        const shouldLog = true;
        
        if (shouldLog) {
          logger.info(`[TS-Plugin] resolveAndMaybeRewrite called for module "${moduleName}" from "${containingFile}"`);
        }
        
        if (
          !moduleName.startsWith("./") &&
          !moduleName.startsWith("../") &&
          !moduleName.startsWith("~/") &&
          !moduleName.startsWith("@/")
        ) {
          return originalResult;
        }
        
        const normalizedContaining = containingFile.replace(/\\/g, '/');
        let projectRoot: string;
        const customMatch = normalizedContaining.match(/^(.+?)\/custom\//);
        if (customMatch) {
          projectRoot = customMatch[1];
        } else {
          projectRoot = project.getCurrentDirectory();
        }
        
        let originalVueFile = normalizedContaining;
        if (normalizedContaining.includes('.vue.') && !normalizedContaining.endsWith('.vue')) {
          const vueMatch = normalizedContaining.match(/^(.+?\.vue)(?:\.[^.]+)?$/);
          if (vueMatch) {
            originalVueFile = vueMatch[1];
            if (shouldLog) {
              logger.info(`[TS-Plugin] Detected virtual file, original Vue file: "${originalVueFile}"`);
            }
          }
        }
        
        const fileToUseForResolve = originalVueFile;
        
        logger.info(`[TS-Plugin] resolveCustomPath called with moduleName: ${moduleName}, importer: ${normalizedContaining}, options: ${JSON.stringify({ projectRoot })}`)
        const resolvedPath = resolveCustomPath(
          moduleName,
          normalizedContaining,
          { projectRoot }
        );
        
        logger.info(`[TS-Plugin] resolveCustomPath returned: "${resolvedPath}"`);
        
        if (!resolvedPath) {
          return originalResult;
        }
        
        const normalizedResolvedPath = resolvedPath.replace(/\\/g, '/');
        const isOriginalResolved = originalResult?.resolvedModule !== undefined;
        const originalResolvedPath = originalResult?.resolvedModule?.resolvedFileName?.replace(/\\/g, '/');
        
        if (isOriginalResolved && originalResolvedPath && originalResolvedPath === normalizedResolvedPath) {
          logger.info(`[TS-Plugin] Resolved path matches original, no rewrite needed`);
          return originalResult;
        }
        
        const fileDir = dirname(fileToUseForResolve);
        let relativePath = relative(fileDir, resolvedPath)
          .replace(/\\/g, '/');
        
        if (relativePath.endsWith('.ts') || relativePath.endsWith('.tsx')) {
          relativePath = relativePath.replace(/\.tsx?$/, '');
        } else if (relativePath.endsWith('.js') || relativePath.endsWith('.jsx')) {
          relativePath = relativePath.replace(/\.jsx?$/, '');
        }
        
        let newModulePath: string;
        if (relativePath.startsWith('..')) {
          newModulePath = relativePath;
        } else if (relativePath.startsWith('.')) {
          newModulePath = relativePath;
        } else {
          newModulePath = './' + relativePath;
        }
        
        logger.info(`[TS-Plugin] Resolving "${moduleName}" -> "${newModulePath}" (from ${containingFile} to ${resolvedPath})`);
        
        try {
          const resolvedModule = ts.resolveModuleName(
            newModulePath,
            fileToUseForResolve,
            options,
            host
          );
          
          if (resolvedModule && resolvedModule.resolvedModule) {
            logger.info(`[TS-Plugin] Successfully resolved "${moduleName}" -> "${newModulePath}" -> "${resolvedModule.resolvedModule.resolvedFileName}"`);
            return resolvedModule;
          } else {
            logger.info(`[TS-Plugin] Failed to resolve "${newModulePath}"`);
          }
        } catch (error) {
          logger.info(`[TS-Plugin] Error resolving "${newModulePath}": ${error}`);
        }
        
        return originalResult;
      }
      
      const originalResolveModuleNameLiterals = host.resolveModuleNameLiterals;
      if (originalResolveModuleNameLiterals) {
        logger.info("[TS-Plugin] Found resolveModuleNameLiterals in host, patching it");
        host.resolveModuleNameLiterals = function(
          moduleLiterals: readonly ts.StringLiteralLike[],
          containingFile: string,
          redirectedReference: ts.ResolvedProjectReference | undefined,
          options: ts.CompilerOptions,
          containingSourceFile: ts.SourceFile,
          reusedNames: readonly ts.StringLiteralLike[] | undefined
        ): readonly ts.ResolvedModuleWithFailedLookupLocations[] {
          const moduleNames = moduleLiterals.map(lit => lit && lit.text).filter(Boolean);
          const shouldLog = true;
          if (shouldLog) {
            logger.info(`[TS-Plugin] resolveModuleNameLiterals ENTRY for "${containingFile}" (raw: ${containingFile}) modules: [${moduleNames.join(', ')}]`);
          }
          
          try {
            const resolved = originalResolveModuleNameLiterals.call(
              this,
              moduleLiterals,
              containingFile,
              redirectedReference,
              options,
              containingSourceFile,
              reusedNames
            );
            
            const results = moduleLiterals.map((moduleLiteral, index) => {
              try {
                const moduleName = moduleLiteral?.text;
                if (!moduleName) {
                  return resolved?.[index];
                }
                
                const originalResult = resolved?.[index];
                const rewritten = resolveAndMaybeRewrite(moduleName, containingFile, options, originalResult);
                return rewritten || originalResult;
              } catch (error) {
                logger.info(`[TS-Plugin] Error processing module "${moduleLiteral?.text}": ${error}`);
                return resolved?.[index];
              }
            });
            
            return results;
          } catch (error) {
            logger.info(`[TS-Plugin] Error in resolveModuleNameLiterals: ${error}`);
            return originalResolveModuleNameLiterals.call(
              this,
              moduleLiterals,
              containingFile,
              redirectedReference,
              options,
              containingSourceFile,
              reusedNames
            );
          }
        };
        host[isResolveModuleNamePatched] = true;
        logger.info("[TS-Plugin] Successfully patched host.resolveModuleNameLiterals");
      } else {
        logger.info("[TS-Plugin] resolveModuleNameLiterals not found in host");
      }
    }

    return info.languageService;
  }

  return { create };
}

export = init;
