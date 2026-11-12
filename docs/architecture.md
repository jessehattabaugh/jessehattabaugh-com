# Architecture and execution domains

## Where code runs

| Source | Execution context | Responsibility |
| --- | --- | --- |
| `build/` | Node.js | Static generation, asset publishing, branding, deployment and secret-management commands |
| `build/templates/` | Node.js | Static-only Apps, Colophon, component documentation and 404 rendering |
| `build/shared/` | Node.js | Dependencies used by multiple build tools, including environment, preview, and public asset helpers |
| `server/index.js` | Cloudflare Worker | HTTP dispatch, error handling, security headers, static asset fallback, scheduled dispatch |
| `server/apps/<app>/` | Cloudflare Worker | App handlers, D1 persistence, server-rendered templates and app-specific helpers |
| `server/pages/` | Cloudflare Worker | Dynamic public pages, social-data caching and image proxying |
| `server/auth/`, `server/data/`, `server/http/`, `server/crypto/`, `server/push/`, `server/templates/` | Cloudflare Worker | Auth, identity persistence, HTTP policy, cryptography, push, and server-only views |
| `server/db/` | D1, applied by Node deployment tooling | Canonical schema and ordered additive migrations |
| `client/apps/<app>/` | Browser | App enhancements, manifests, images, offline pages and colocated `sw.js` service workers |
| `client/components/` | Browser main thread | Portable Custom Elements and their demonstrations |
| `client/enhance/` | Browser main thread | Progressive navigation, authentication, installation and push registration |
| `client/styles/` | Browser | Cross-app/site CSS |
| `client/apps/rainbow-hour/storage.js` | Browser main thread and service worker | IndexedDB location storage |
| `client/branding/`, root client icons/manifest | Browser assets | Public identity artwork and site installation metadata |
| `shared/` | Multiple execution domains | Only actual build/server/client reuse, detailed below |
| `test/` | Node.js and Playwright browsers | Real deployed-preview functional suites; test-only reuse in `test/shared/` |

An app spans server and client directories because the top-level boundary says
where code executes. Files of any type belong in a `shared/` directory only when
imported across the contexts that directory serves. Browser sharing means both
main-thread and worker code. Cloudflare sharing means at least two Cloudflare
services. The site has one Worker. Build sharing means at least two build tools.
Within one context, import from the owning directory.

Root tool configurations stay discoverable at the root: package scripts, Wrangler,
ESLint, Playwright and the TypeScript project index. `dist/`, `.wrangler/`, browser
reports and dependencies are generated, ignored output rather than source domains.

## What root shared means

- `shared/html.js`: escaped HTML primitives used by Node generation and Cloudflare rendering.
- `shared/routes.js`: URL vocabulary and static/dynamic route registry used by build/server.
- `shared/templates/pages/`: pure public-page/fragment templates rendered by build/server.
- `shared/templates/`: layout, account affordances, and error views reused by build/server rendering.
- `shared/data/atproto.js`: public social-data reads and normalized values used by build/server, with no credentials or D1 access.
- `shared/rainbow-hour/`: solar, rainbow and weather logic executed on Cloudflare and in browser contexts.

Root shared modules cannot import build, server, client or test implementations.
Server-specific types stay in `server/types.js`; app record contracts stay
with their server app. Server-only app templates have one source in
`server/apps/<app>/templates.js`; auth/install views live in `server/templates/`.
Static-only Apps, Colophon, component documentation, and 404 templates live in
`build/templates/`; their catalog is in `build/component-catalog.js`.
Templates execute on the machine rendering HTML. They are not browser scripts.

There is no source `site/` directory. Browser content/assets live under `client/`;
public-page rendering shared by Node and Cloudflare lives under root `shared/`.
The route catalog in `shared/routes.js` names each static template module and export.

## Follow a request

`server/index.js` applies origin/method checks, dispatches registered routes to
`server/pages/worker.js`, `server/apps/<app>/worker.js` or the auth handler, then
adds security/cache headers. Unhandled data errors become the standard error
page; missing static assets become the custom 404 with status 404.

Handlers authorize and validate before rendering. They call data modules using
prepared statements and pass authorized values/affordances into pure templates.
Each full-page function calls its fragment function directly. `X-Fragment: true`
returns that same fragment at the same URL. Successful forms redirect with 303;
validation responses retain entered values. Browser enhancement follows existing
HTML controls and falls back to native submission/navigation on errors.

The Node build registers catalog templates with Hono and uses its SSG helper
to render the same public-page templates and publish the prepared snapshot and branding.
No server handlers, secrets, D1 queries or template JavaScript are published.

## Source paths and public URLs

`build/build.js` cleans `dist/client/`, prepares public data and generated
artwork under private `dist/inputs/`, and renders the route catalog using Hono's
SSG helper. Node writes metadata and copies browser assets without changing bytes.
`build/prepare-inputs.js` and `build/branding.js` generate image sizes and cards
with Sharp; authored client artwork is never transformed.

The route catalog is authoritative for URLs, methods, feature handler selection,
static template module/export, sitemap inclusion, navigation and smoke-test headings.
`paths`, `staticRoutes`, `dynamicRoutes` and `sitemapPaths` are derived views.
Worker feature handlers are bound once; Hono replaces the string dispatch chain.
The build loads template modules in Node only, so static-only templates never
enter the Worker or browser bundle. Adding a static page needs one registration.

Client directory structure maps directly to public URLs by removing `client/`.
Imports remain native browser imports; CSS, SVG, JSON and manifests are copied
unchanged. Agent instructions and TypeScript configurations are excluded.
Component package metadata, manifests, licenses and documentation stay public.
The only cross-runtime browser publication is `shared/rainbow-hour/*.js`, explicitly
copied to `/shared/rainbow-hour/`; no other shared modules become public.

App workers live beside their scopes at `/apps/<app>/sw.js`. Browser and service
worker code use separate checkJs projects but neither gets transpiled or bundled.
Wrangler remains free to bundle and minify Cloudflare code. The browser follows
module imports and ordinary asset URLs; no synthetic dependency loader is generated.

Authored SVG lives in `build/artwork/` for build-only composition, or beside its
app under `client/` for browser use. Gallery icons reuse existing SVG files;
Lightsfinder's fixed artwork uses symbols from `illustrations.svg`. Its map
geometry remains an escaped server template because it represents live sightings,
coordinates, links and accessible controls.

`build/shared/public-assets.js` supplies canonical public page URLs from `shared/routes.js`,
including server-rendered apps, using the configured production `SITE_ORIGIN`.
Error, auth/private, asset and query URLs are excluded; unverified modification
dates are omitted. The Node build emits sitemap and robots together.

Portable components retain their package metadata, API manifest, README and MIT
license under `client/components/<tag>/`. Their source distribution is
GitHub-only. They do not import site/app/server code. Update `build/component-catalog.js`
and `build/templates/components.js` when changing catalog documentation.

## Boundaries and verification

`npm run check` checks Cloudflare, Node/build, browser main-thread and service-worker
code in separate TypeScript projects. The two browser projects use DOM and
WebWorker libraries respectively, with automatic ambient package types disabled.
App `sw.js` files stay colocated with app code and are excluded from the DOM project.
ESLint assigns globals by runtime and rejects imports across forbidden boundaries.
Keep direct imports; do not add barrels that conceal dependencies.

`test/apps/`, `test/site/` and `test/platform/` describe deployed browser behavior.
`test/shared/` owns fixtures, D1 maintenance and Lighthouse helpers. Tests may
reuse Node configuration/preview tooling from `build/shared/` and real server data
interfaces for fixture maintenance; production code must never import tests.

Run checks, lint and build, then deploy the non-main branch and run all preview
suites for changes across runtimes. Never run functional tests against localhost
or production. Preview upload must bind a disposable branch D1 database and must
not promote a production version. See [the operations reference](reference.md).

## Transaction boundary

Email proof, account verification and held-message approval intentionally form a
single D1 transaction in `server/data/email-verification.js`. Its SQL crosses
the identity/messages boundary. The auth handler coordinates message notification
after commit. Future decoupling needs transactional design and replay/error tests;
independent writes would weaken consistency. This reorganization changes no schema
or transaction behavior.
