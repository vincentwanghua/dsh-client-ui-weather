# BUILD-NOTES — dsh-client-ui-weather

## ⚠️ Critical: how the bundle is loaded (read before rebuilding)

The running DSH web shell does **not** `import` this plugin's `lib/client.js`.
It loads it through the client-modules Loader, which expects every plugin bundle
to **register its factory up front**:

```js
window.__ModuleLoader__.load({
  id: "@deepseek-ai/dsh-client-ui-weather",
  factory: (require) => { /* … CJS body … */ return module.exports; }
});
```

At boot the host calls `factory(require)` and reads back `{ apply, inject }` to
wire up Cordis. If the bundle is a **plain esbuild/vite IIFE or ES-module** it
lacks this registration header → the Loader throws
`"bundle loaded without registering … via __ModuleLoader__.load"` and **DSH fails
to boot**.

Two things a naive CJS dump omits that the golden bundle has (both required):

1. `var module = { exports: {} }` declared **inside** the factory — esbuild's body
   uses bare `module`, so without this it is an undefined reference at runtime.
2. the body ends with `return module.exports;` so `factory()` returns `{apply, inject}`.

> Symptom of getting it wrong: DSH GUI will not start after a restart. If that
> happens, restore the backup and fix the build (see below).

### ⚠️ Critical #2 — JSX MUST use the automatic runtime (`jsx: 'automatic'`)

This is the **#1 reason an offline build makes the weather plugin disappear**.

The official tsdown build emits the **automatic** JSX runtime, i.e. it keeps
`require("react/jsx-runtime")` as an external. DSH's client-modules react shim
provides that `jsx-runtime`. If your esbuild run instead uses the **classic**
runtime (which emits `React.createElement(...)`), the host shim does **not** expose
a working `createElement`, so `factory()` throws at materialization → **the plugin
fails to load and vanishes from the GUI.**

How to tell which runtime a built bundle uses:

| signal | automatic (✅ correct) | classic (❌ breaks boot/loads) |
|--------|------------------------|-------------------------------|
| `react/jsx-runtime` present in bundle | yes | no |
| `createElement(` occurrences | ~1 (react internals only) | many (20+) |
| external `require`s | `react`, `@deepseek-ai/dsh-client-ui-primitives`, `react/jsx-runtime` | missing `react/jsx-runtime` |

The offline builder (`client-build.mjs`) now forces it explicitly — **do not remove**
these two lines; they are what make the bundle match the official shape:

```js
jsx: 'automatic',
jsxImportSource: 'react',
```

> Symptom of getting it wrong: the weather plugin is present in `lib/` but **does not
> show in the GUI** after a reload. Fix = rebuild (the builder above already sets
> `jsx:'automatic'`) and reinstall, or restore `lib\client.js.working.bak`.

## How to rebuild (two ways)

### A — Official (preferred; needs a DeepSeek-Harness checkout)

```bash
pnpm --filter @deepseek-ai/dsh-client-ui-weather bundle   # tsdown → lib/client.js
```

This is what the repo's own `bundle` script documents. It produces the exact
official shape automatically.

### B — Offline (no monorepo; bare esbuild)

The official client-modules build tooling isn't importable from an installed DSH,
so this plugin ships a self-contained offline builder that reproduces the same
output with `esbuild --packages=external` + a small CSS-inject plugin:

```bash
# 1. install the build tool (one-time)
npm i

# 2. build → out/client-registered.js  (does NOT touch lib/)
node client-build.mjs          # or: npm run bundle:offline

# 3. sanity-check it registers + returns {apply, inject}
node verify-register.mjs       # prints: PASS: factory returns {apply, inject}...

# 4. install with a backup, then restart DSH web to pick it up
copy out\client-registered.js lib\client.js.bak   # (backup the current one first!)
copy out\client-registered.js lib\client.js
```

Files in this dir:

| file | purpose |
|------|---------|
| `client-build.mjs`      | offline builder → CJS bundle wrapped in `window.__ModuleLoader__.load({id,factory})` |
| `css-inject.cjs`        | esbuild plugin: maps `.module.css` classes + injects `<style>` at runtime |
| `verify-register.mjs`   | simulates host materialization (must print PASS) before installing |
| `out/`                  | scratch build output (`_tmp.cjs`, `client-registered.js`) — safe to discard |

## Recovery if a bad bundle breaks boot

```bash
copy lib\client.js.bak lib\client.js      # restore last-known-good, then restart DSH web
```

The current good bundle is also backed up as `lib\client.js.bak`. If that backup
is ever gone and you must recover without network (GitHub large transfers are
reset from this machine), the official bundle is still cached inside the installed
DSH: `C:\Users\vincent\AppData\Roaming\npm\node_modules\@deepseek-ai\dsh\node_modules\@deepseek-ai\dsh-client-ui-weather\lib\client.js`.

## Search / geocoding behaviour (Open-Meteo `/v1/search`)

`geocodeCity()` calls Open-Meteo's free search. Two things worth knowing:

- It matches **populated place names only**. A full district name like `海淀区` returns
  nothing, but its base `海淀` is indexed → 1 result. Pure-admin areas like `浦东` aren't
  in the gazetteer at all and can never be found by this endpoint (free-API limit).
- **Fallback**: when the exact query yields no results we strip one trailing
  administrative suffix (`省/市/区/县/镇/乡/街道/盟/旗…`) and retry once. So `朝阳区`→`朝阳`,
  `南山区`→`南山`, `海淀区`→`海淀` now work; city names are unaffected (they already return).
- The empty state now shows `未找到「…」，试试更短的地名或城市名` so a district that truly
  can't be resolved doesn't look like a bug.

## Notes on this session's changes

- Full date-time on the update timestamp (`year/month/day/hour/minute`) — in `src/`; rebuild with A or B to ship.
- Precise district/street-level search + suffix-stripping fallback — in `src/` (`geocodeCity`, `weather-data.ts`); same.
