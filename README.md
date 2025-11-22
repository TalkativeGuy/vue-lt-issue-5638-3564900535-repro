# A reproduction of an issue with @vuejs/language-tools

This is a reproduction of an issue mentioned in [this comment](https://github.com/vuejs/language-tools/issues/5638#issuecomment-3564900535).
I demonstrates how the "Vue — Official" extension for VSCode ignores local TypeScript plugins when there are default imports of components in the files.

The problem in general is described in the comment referenced above with an addition of [another one](https://github.com/vuejs/language-tools/issues/5638#issuecomment-3566421728) following it. In the files there are comments with a little more details.

The TypeScript plugin is made as a local package in `/custom-scripts/typescript-plugin` and is imported in `package.json` by the name `typescript-custom-resolver-plugin`. To make it work you need to:
- Run `npm i`
- Add the path `node_modules/typescript-custom-resolver-plugin` to the `typescript.tsserver.pluginPaths` setting in VSCode
- Restart TS Server via the Command Palette

You don't need to build the plugin as it is already built and included in the repo.

## Files to look at

The files you mostly want to look at are these:
- `/pages/index.vue` — the simplest example possible.
- `/custom/src/features/auth/MainComponent.vue` — a little more complicated example, showing how just an occurrence of a default import of a Vue component disables *all* the imports in the file from being handled by the plugin.
- `/custom/src/features/auth/average.ts` — an example of the module resolution working perfectly as intended.

Before you go into the files, below I have provided an explanation of how my TS plugin is intended to work so you don't have to try and understand what's going on here with the imports on your own. Don't worry, the principle itself is not complicated whatsoever.

## How the TS plugin is intended to work (and does work until it gets ignored)

The core concept: any source file can be duplicated to and then modified in the `/custom` directory, and the custom file will override the original file in both dev and production versions, without changing all the imports of the duplicated file.

### File Override Principle

When a module is imported, the system checks if a file with the same relative path exists in the `/custom` directory. If such a file exists, it gets used instead of the original.

For example:
- Import `~/src/features/auth/MainComponent.vue` normally resolves to `/src/features/auth/MainComponent.vue`
- If `/custom/src/features/auth/MainComponent.vue` exists, it resolves to that instead
- Same applies to index files

If a module is imported via a relative path by a custom file, the path will be handled in the same way as if it was imported from outside of the `/custom` directory. You can see an example in `/custom/src/features/auth/MainComponent.vue`. It has the `./utils` import, which would normally resolve to the file `utils.ts` in the same directory, but since such a file doesn't exist — it gets resolved to `/src/features/auth/utils.ts` instead. It is made this way so you could copy and paste files to `/custom` without the need to change all the relative paths to absolute paths (it could be automated, but there are also other reasons to make it this way).

### Two Plugins — Two Responsibilities

This reproduction includes two plugins, each with its own responsibility:

**/custom-scripts/typescript-plugin** — makes sure that TypeScript handles the imports by the same logic as Vite.

**/custom-scripts/vite-plugin.ts** — handles actual module resolution during build and dev server runtime. It works perfectly fine and was included in this reproduction just so you would able to run the dev server and understand how the system works in practice, if you want.

Our project includes some other scripts to help work with this kind of system, but they are not included here as they aren't needed for the minimal reproduction.


