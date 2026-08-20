// Offline client-bundle builder for this plugin, matching the official dsh
// client-modules format:  window.__ModuleLoader__.load({ id, factory }) (lazy-CJS)
//
// WHY this exists: a plain esbuild/vite IIFE or ESM bundle is WRONG here — it
// lacks the `window.__ModuleLoader__.load` registration header that the host's
// client-modules Loader consumes as its internal seam. Without it DSH fails to
// boot ("bundle loaded without registering ... via __ModuleLoader__.load").
//
// The official build (when you have the monorepo) is just:
//     pnpm --filter @deepseek-ai/dsh-client-ui-weather bundle   // tsdown
// This script is an offline fallback that reproduces the same output shape with
// bare esbuild + `packages=external` (react/@deepseek-* stay external, required
// at runtime by the host). It does NOT touch lib/client.js — it writes to ./out/
// so the install step stays a deliberate, backed-up action.
//
// Usage:  node client-build.mjs          -> writes out/client-registered.js
//         node verify-register.mjs       -> (see below) simulate host materialization
import * as esbuild from 'esbuild'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PLUGIN_DIR = __dirname                       // plugin root (this dir)
const pkg        = JSON.parse(readFileSync(path.join(PLUGIN_DIR, 'package.json'), 'utf8'))
const id         = pkg.name                        // e.g. @deepseek-ai/dsh-client-ui-weather
const entry      = path.join(PLUGIN_DIR, 'src', 'client', 'index.ts')

const cssPlugin = (await import('./css-inject.cjs')).default

mkdirSync(path.join(PLUGIN_DIR, 'out'), { recursive: true })
const tmpCjs    = path.join(PLUGIN_DIR, 'out', '_tmp.cjs')
const outScript = path.join(PLUGIN_DIR, 'out', 'client-registered.js')

// Step 1 — CJS bundle. esbuild emits the standard `var module={exports:{}}` body;
// react/@deepseek-* are external (bare require(...)) to avoid duplicate copies.
await esbuild.build({
  entryPoints: [entry],
  outfile: tmpCjs,
  bundle: true,
  format: 'cjs',
  packages: 'external',
  // ESSENTIAL — match the official tsdown build exactly:
  //   * jsx:'automatic' emits require('react/jsx-runtime') (kept external), which
  //     DSH's client-modules react shim provides. The DEFAULT classic runtime
  //     instead emits React.createElement(...), and the host shim does NOT expose a
  //     working createElement -> factory throws at materialization -> plugin fails to
  //     load ("weather plugin disappears"). This is the #1 reason offline builds fail.
  jsx: 'automatic',
  jsxImportSource: 'react',
  plugins: [cssPlugin],
  logLevel: 'info',
})

// Step 2 — wrap the CJS body inside factory:(require)=>{...} and register it.
// Two things a naive CJS dump omits that the golden bundle has (and that are
// REQUIRED for the host to materialize {apply, inject}):
//   * declare `var module = {exports:{}}` INSIDE the factory (esbuild's body uses
//     bare `module`; without this it is an undefined ref at runtime), and
//   * end with `return module.exports;` so factory() returns the exports object.
const body       = readFileSync(tmpCjs, 'utf8').replace(/\n+$/, '')
const localHeader = [
  '\t\tvar module = { exports: {} };',
  '\t\tvar exports = module.exports;',
  '\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: "Module" });',
].join('\n')

const wrapped = `window.__ModuleLoader__.load({
	id: ${JSON.stringify(id)},
	factory: (require) => {
${localHeader}

${body.split('\n').map((l) => `\t${l}`).join('\n')}
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
`

writeFileSync(outScript, wrapped)
console.log(`built ${path.relative(process.cwd(), outScript)} (${Math.round(wrapped.length / 1024)}KB), id=${id}`)
console.log('next: copy out/client-registered.js -> lib/client.js (after backing up the old one) and restart DSH web')
