# Architecture and execution domains

## Where code runs

| Source | Execution context | Responsibility |
| --- | --- | --- |
| `build/` | Node.js | Static generation, asset publishing, branding, deployment and secret-management commands |
| `build/templates/` | Node.js | Static-only Apps, Colophon, component documentation and 404 rendering |
| `build/shared/` | Node.js | Environment loading and branch/configuration helpers reused by commands and the test runner |
| `server/index.js` | Cloudflare Worker | HTTP dispatch, error handling, security headers, static asset fallback, scheduled dispatch |
| `server/apps/<app>/` | Cloudflare Worker | App handlers, D1 persistence, server-rendered templates and app-specific helpers |
| `server/pages/` | Cloudflare Worker | Dynamic public pages, social-data caching and image proxying |
| `server/shared/` | Cloudflare Worker | Cross-app auth, identity persistence, HTTP policy, cryptography, push and auth views |
| `server/db/` | D1, applied by Node deployment tooling | Canonical schema and ordered additive migrations |
| `client/apps/<app>/` | Browser | App enhancements, manifests, images, offline pages and colocated `sw.js` service workers |
| `client/shared/components/` | Browser main thread | Portable Custom Elements and component demo/auth UI |
| `client/shared/enhance/` | Browser main thread | Progressive form/link navigation, installation and push registration |
| `client/shared/styles/` | Browser | Cross-app/site CSS |
| `client/shared/rainbow-hour/` | Browser main thread and service worker | IndexedDB location storage |
| `client/branding/`, root client icons/manifest | Browser assets | Public identity artwork and site installation metadata |
| `shared/` | Multiple execution domains | Only actual build/server/client reuse, detailed below |
| `test/` | Node.js and Playwright browsers | Real deployed-preview functional suites; test-only reuse in `test/shared/` |

An app spans server and client directories because the top-level boundary says
where code executes. Keep feature ownership inside each runtime. A helper shared
by two apps belongs in that runtime's `shared/`, rather than root `shared/`.
Do not create empty shared directories in anticipation of reuse.

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
Server-specific types stay in `server/shared/types.js`; app record contracts stay
with their server app. Server-only app templates have one source in
`server/apps/<app>/templates.js`; auth/install views live in `server/shared/templates/`.
Static-only Apps, Colophon, component documentation, and 404 templates live in
`build/templates/`; their catalog is in `build/shared/components.js`.
Templates execute on the machine rendering HTML. They are not browser scripts.

There is no source `site/` directory. Browser content/assets live under `client/`;
public-page rendering shared by Node and Cloudflare lives under root `shared/`.
The static-only page function registry lives in `build/pages.js`.

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

`build/build.js` renders `build/pages.js` with the same public-page templates,
saves the public social snapshot, publishes client assets and generates branding.
No server handlers, secrets, D1 queries or template JavaScript are published.

## Source paths and public URLs

`build/assets.js` explicitly maps browser source files into `dist/client/`:

| Source | Public destination |
| --- | --- |
| `client/apps/` | `/apps/` (including unchanged `sw.js` URLs and app scopes) |
| `client/branding/`, site icon/manifest | `/branding/`, `/icon.svg`, `/manifest.webmanifest` |
| `client/shared/components/` | `/components/` |
| `client/shared/enhance/` | `/enhance/` |
| `client/shared/styles/` | `/styles/` |
| `client/shared/rainbow-hour/` | `/apps/rainbow-hour/` |
| `shared/rainbow-hour/` | `/apps/rainbow-hour/` |

The build rebases relative module imports/exports against these destinations.
Modules remain native ES modules; no bundler or runtime dependency is added.
A relative module import without a published destination fails the build.
Runtime URL strings, service-worker registration paths, cache URLs, manifests
and component download URLs retain their existing public meaning. Type-checking
configuration is excluded. New asset roots need an explicit mount; never copy
all of root `shared/` or `server/` into the public output.

Portable components retain their package metadata, API manifest, README and MIT
license under `client/shared/components/<tag>/`. Their source distribution is
GitHub-only. They do not import site/app/server code. Update `build/shared/components.js`
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
single D1 transaction in `server/shared/data/email-verification.js`. Its SQL crosses
the identity/messages boundary. The auth handler coordinates message notification
after commit. Future decoupling needs transactional design and replay/error tests;
independent writes would weaken consistency. This reorganization changes no schema
or transaction behavior.
