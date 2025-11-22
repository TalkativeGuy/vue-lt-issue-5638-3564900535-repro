"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveCustomPath = resolveCustomPath;
const path_1 = require("path");
const fs_1 = require("fs");
const DEFAULT_EXTENSIONS = [".ts", ".js", ".tsx", ".jsx", ".vue"];
function getOriginalImporterPath(importerPath, customDir, projectRoot) {
    const normalizedImporter = importerPath.replace(/\\/g, '/');
    const normalizedCustomDir = customDir.replace(/\\/g, '/');
    if (normalizedImporter.startsWith(normalizedCustomDir)) {
        const relativePath = (0, path_1.relative)(customDir, importerPath);
        const originalPath = (0, path_1.resolve)(projectRoot, relativePath);
        return originalPath;
    }
    return importerPath;
}
function findFileWithExtension(basePath, extensions, excludePath) {
    for (const ext of extensions) {
        const pathWithExt = basePath + ext;
        if ((0, fs_1.existsSync)(pathWithExt)) {
            if (excludePath && (0, path_1.resolve)(pathWithExt) === (0, path_1.resolve)(excludePath)) {
                continue;
            }
            return pathWithExt;
        }
    }
    return null;
}
function findIndexFile(dirPath, extensions) {
    if (!(0, fs_1.existsSync)(dirPath)) {
        return null;
    }
    const stat = (0, fs_1.statSync)(dirPath);
    if (!stat.isDirectory()) {
        return null;
    }
    for (const ext of extensions) {
        const indexPath = (0, path_1.resolve)(dirPath, `index${ext}`);
        if ((0, fs_1.existsSync)(indexPath)) {
            return indexPath;
        }
    }
    return null;
}
function resolveCustomPath(moduleName, importer, options = {}) {
    const projectRoot = options.projectRoot || process.env.NUXT_ROOT_DIR || process.cwd();
    const extensions = options.extensions || DEFAULT_EXTENSIONS;
    const customDir = (0, path_1.resolve)(projectRoot, "custom");
    if (!moduleName || !importer) {
        return null;
    }
    if (importer.includes(".nuxt")) {
        return null;
    }
    const isAbsolutePath = /^[A-Z]:/i.test(moduleName) || moduleName.startsWith("/");
    const isRelativeOrAlias = moduleName.startsWith(".") || moduleName.startsWith("~") || moduleName.startsWith("@");
    if (!isAbsolutePath && !isRelativeOrAlias) {
        return null;
    }
    let resolvedPath;
    if (moduleName.startsWith("./") || moduleName.startsWith("../")) {
        const originalImporter = getOriginalImporterPath(importer, customDir, projectRoot);
        resolvedPath = (0, path_1.resolve)((0, path_1.dirname)(originalImporter), moduleName);
    }
    else if (moduleName.startsWith("/") && !isAbsolutePath) {
        resolvedPath = (0, path_1.resolve)(projectRoot, moduleName.slice(1));
    }
    else if (moduleName.startsWith("~/") || moduleName.startsWith("@/")) {
        const pathWithoutAlias = moduleName.slice(2);
        resolvedPath = (0, path_1.resolve)(projectRoot, pathWithoutAlias);
    }
    else if (isAbsolutePath) {
        resolvedPath = moduleName;
    }
    else {
        return null;
    }
    let actualResolvedPath = resolvedPath;
    if (!(0, path_1.extname)(resolvedPath)) {
        const fileWithExt = findFileWithExtension(resolvedPath, extensions, importer);
        if (fileWithExt) {
            actualResolvedPath = fileWithExt;
        }
        else {
            const indexFile = findIndexFile(resolvedPath, extensions);
            if (indexFile) {
                actualResolvedPath = indexFile;
            }
        }
    }
    const relativePath = (0, path_1.relative)(projectRoot, actualResolvedPath);
    const customPath = (0, path_1.resolve)(projectRoot, "custom", relativePath);
    if (!(0, fs_1.existsSync)(actualResolvedPath)) {
        if ((0, fs_1.existsSync)(customPath)) {
            const customStat = (0, fs_1.statSync)(customPath);
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
        const customPathWithoutExt = (0, path_1.extname)(customPath)
            ? customPath.slice(0, -(0, path_1.extname)(customPath).length)
            : customPath;
        const customFileWithExt = findFileWithExtension(customPathWithoutExt, extensions);
        if (customFileWithExt) {
            return customFileWithExt;
        }
        return null;
    }
    if ((0, fs_1.existsSync)(customPath)) {
        const customStat = (0, fs_1.statSync)(customPath);
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
    const customPathWithoutExt = (0, path_1.extname)(customPath)
        ? customPath.slice(0, -(0, path_1.extname)(customPath).length)
        : customPath;
    const customFileWithExt = findFileWithExtension(customPathWithoutExt, extensions);
    if (customFileWithExt) {
        return customFileWithExt;
    }
    if ((0, fs_1.existsSync)(actualResolvedPath)) {
        const stat = (0, fs_1.statSync)(actualResolvedPath);
        if (stat.isFile()) {
            return actualResolvedPath;
        }
    }
    return null;
}
