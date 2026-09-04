# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common commands

There is no root `package.json`; each app is installed and run independently with `npm --prefix`.

```bash
# install (each app has its own package-lock.json)
npm --prefix host install
npm --prefix remote install
npm --prefix report install

# dev: start remotes first, host last
npm --prefix remote run dev    # :3101
npm --prefix report run dev    # :3102
npm --prefix host run dev      # :3100

# build
npm --prefix remote run build
npm --prefix report run build
npm --prefix host run build

# typecheck (no script is defined; tsconfig has noEmit: true)
cd host && npx tsc --noEmit
cd remote && npx tsc --noEmit
cd report && npx tsc --noEmit
```

No lint or test scripts are configured in any app.

Open `http://localhost:3100` for the integrated shell. `remote` (:3101) and `report` (:3102) also have standalone preview pages.

**Restart the dev server after editing any `rspack.config.mjs`** — Rspack dev server does not watch config files, and stale config surfaces as `Module "./xxx" does not exist in container`.

## Architecture

Rspack 2.x module-federation admin skeleton: three independent React 19 + TypeScript apps built with `rspack.container.ModuleFederationPlugin` (the built-in plugin, plus `@module-federation/runtime-tools` and `@rspack/dev-server` as required Rspack 2.x deps).

- `host/` (:3100) is the shell: it owns the antd `Layout` (Sider menu + Header + Content), menu→page mapping, `ConfigProvider locale={zhCN}`, and the global stylesheet. It consumes remote pages via `lazy(() => import('report_app/Dashboard'))` etc. in `host/src/App.tsx`, wrapped in a single `Suspense` whose fallback fills the content area.
- `remote/` (:3101, federation name `remote_app`) exposes pages `./UserList` and `./OrderList`. `remote/src/App.tsx` is only the standalone preview shell and is **not** exposed.
- `report/` (:3102, federation name `report_app`) exposes `./Dashboard`, which receives a `userName` prop from the host — the example of host→remote communication (props only; remotes do not import from the host).

Conventions that must be preserved:

- **Async boundary**: every app's `src/index.tsx` contains only `import('./bootstrap')` so the federation runtime can load `remoteEntry.js` and negotiate shared deps before app code runs.
- **Page-granularity exposes**: remotes expose individual pages, so a menu click lazy-loads only that page's chunk. To add a federated page: add it to the remote's `exposes`, add a `lazy()` import + entry in `PAGES`/`menuItems` in `host/src/App.tsx`, and declare the module in `host/src/declarations.d.ts` (remote modules don't exist at host compile time).
- **Shared singletons**: `react`, `react-dom`, and `antd` are `singleton: true` in all three configs, so the host's `ConfigProvider` context applies inside remote pages. Shared packages are not tree-shaken — each becomes a full separate chunk.
- **Remote chunk URLs**: each remote sets `output.publicPath: 'auto'` and sends `Access-Control-Allow-Origin: *`, so chunks are fetched back from whatever origin `remoteEntry.js` was loaded from (never the host's origin). Correspondingly, the host's `remotes` are **promise-based dynamic entries** (`dynamicRemote()` in `host/rspack.config.mjs`) that build the entry URL from `window.location.hostname` — never hardcode `localhost` or a LAN IP, or cross-device access breaks with `#RUNTIME-008`.
- **Global styles**: `src/styles/global.less` (modern reset) is imported only in each app's `bootstrap.tsx`. Remote bootstraps don't execute when consumed by the host, so exactly one reset (the host's) is active in integrated mode. Keep the three copies in sync (a shared npm package is the intended real-project evolution).
- **Request layer**: `src/request/index.ts` is the axios wrapper (typed `get/post/put/del` returning unwrapped `data`, `{ code, data, message }` envelope with `code === 0` success, unified error toast, 401 → login redirect, duplicate-request cancellation). It lives outside React; each app's `bootstrap.tsx` injects the context-aware `message` via `setErrorToast` (host's copy wins in integrated mode). Keep the three copies in sync, same convention as `global.less`.
- **Boot loading is two-stage**: `host/index.html` ships a fully inline, self-contained HTML/CSS placeholder inside `#root` (no inheritance from `body`, no dependence on JS-injected styles, or it shifts when styles arrive); after React mounts, the `Suspense` fallback in `App.tsx` takes over with a centered `Spin` in the content area.
- Styling is Less compiled by Rspack's built-in CSS pipeline (`type: 'css'` + `less-loader`); TS/TSX goes through `builtin:swc-loader` with the automatic JSX runtime.
