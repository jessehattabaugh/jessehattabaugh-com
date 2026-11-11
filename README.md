# jessehattabaugh.com

A personal site and gallery of progressive web apps built with JavaScript ES modules,
JSDoc, native CSS, and Cloudflare Workers/D1. HATEOAS (Hypertext As The Engine Of
Application State) is the overall architectural goal; Progressive Enhancement in the
client using cutting edge web apis. 

## Start here

1. Read [the architecture](docs/architecture.md) for ownership and request flow.
2. Follow one feature from `server/apps/<name>/worker.js` through `data.js` and
	`templates.js`, then its browser flows in `test/apps/`.
3. [AGENTS.md](AGENTS.md) defines contribution rules.

| Directory | Runs in / contains |
| --- | --- |
| `build/` | Node.js: HTML/assets, branding, deployment and secrets tooling; common tooling in `build/shared/` |
| `server/` | Cloudflare: handlers and app data/templates; common infrastructure in `server/shared/`, schema/migrations in `server/db/` |
| `client/` | Browser: app scripts, service workers beside their app code, manifests and images; cross-app/context assets in `client/shared/` |
| `shared/` | Cross-runtime modules: build/server rendering and social reads, routes, server/browser solar/weather logic |
| `test/` | Deployed-preview Playwright suites; fixtures and audit helpers in `test/shared/` |

`npm run build` prepares a public-data snapshot and artwork under ignored
`dist/inputs/`, then invokes Parcel **once**. Parcel renders the shared page
templates and emits HTML, sitemap/robots, snapshots/catalogs, manifests, component
libraries, browser assets and module service workers directly to `dist/client/`.
There is no source staging tree, asset-copy step, or generated package configuration.

Parcel targets live in the root `package.json` (site and component exports),
`client/package.json` (browser entries), and `client/apps/package.json` (service
workers). `build/site.json` selects the home template; `shared/routes.js` supplies
the other pages. TypeScript and ESLint still check each source runtime separately;
Wrangler compiles/minifies Cloudflare code.

Public assets use short `/apps/`, `/branding/`, `/components/`, `/enhance/`, and
`/styles/` URLs. Local references are relative; shared/error views use root-relative
references when needed. Web app manifests always use `manifest.webmanifest`.
Static artwork lives in `.svg` files; JavaScript only binds data or composes
request-dependent visuals. `/contact` permanently redirects to Jessages.

Parcel is pinned to `3.0.0-alpha.2`. Its embedded JS plugins cannot load Sharp,
so Node prepares the identity/card PNGs and required icon sizes; Parcel owns their
optimization and public emission. There are no new runtime dependencies.

The build emits `/sitemap.xml` and `/robots.txt` from the canonical public routes.
`SITE_ORIGIN` in `.dev.vars` configures the production origin, including on previews.
Only searchable public pages belong in the sitemap: manifests, scripts, private
account pages, errors and query variants do not. No guessed modification dates
are emitted. See [Google's sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
and [Parcel v3 migration notes](https://v3.parceljs.org/migration/parcel-2/).

## Reusable components

`/components/` showcases standalone Custom Elements. Each component lives in
`client/shared/components/<tag>/` with ES modules, `package.json`, a Custom Elements
Manifest (including `x-listens` for incoming events), README, and MIT license.
Source distribution is GitHub-only; consumers vendor a pinned revision and can
install its local package with npm, pnpm, or Yarn. No registry release is needed.

[Retro game components](https://jessehattabaugh.com/components/retro-game/) are
shipped together in `client/shared/components/retro-game/`. Their documentation
includes runnable graphics examples and Aether Wing at `/games/aether-wing/`,
listed in the `/games/` showcase. Pattern banks, palettes, tilemaps, layers and
sprite records are declared in HTML. CSS supplies projection, scrolling,
palette and frame animations. Native controls support steering, targeting and
sector selection without scripting. JavaScript adds continuous input,
collision simulation and gamepad support. See the package README for the contract.

To add one, extend `build/shared/components.js` (also emitted as `/components/catalog.json`),
declare its native library outputs in the root `package.json`,
add its showcase and documentation template in `build/templates/components.js`, and entries
in `build/pages.js` and `shared/routes.js`, and cover its browser API in
`test/site/components.test.js`. Include the new route in the smoke/Lighthouse
heading map. Preserve a native HTML fallback. `disclosure-panel` is the first
example, also used for app-install help.

## Develop and verify

Use Node.js 22+ and tabs. Copy `.dev.vars.example` to the ignored `.dev.vars`
if it does not already exist; fill only the settings required for your work.

```sh
npm ci
npm run check
npm run lint
npm run build
```

`npm run check` checks Cloudflare, Node, browser, and service-worker contexts
separately. `dist/` is generated. `sharp` is a build-only dependency for correctly sized
icons; `globals` supplies ESLint’s environment definitions. Verify dependency
changes with a clean `npm ci`; do not rely on transitive packages.

On a non-`main` branch, authenticate Wrangler and run:

```sh
npm run deploy:preview
npm test
# Or one feature across desktop/mobile, with and without JavaScript:
npm test -- test/apps/crunch-time.test.js
```

Deployment creates/reuses a branch-isolated D1 database and uploads an unpromoted
version. Tests derive its URL and database from the branch and check isolation.
`PREVIEW_URL` is an optional override. Never test against production or localhost.
Install browsers once with `npx playwright install chromium`.

Stateful tests need `CLOUDFLARE_ACCOUNT_ID` and a D1-capable
`E2E_CLOUDFLARE_API_TOKEN`. Routine tests send no email. Real email tests require
explicit `E2E_EMAIL_FLOW=1` and a controlled `E2E_EMAIL_DOMAIN`; they verify binding
acceptance and confirmation, not inbox arrival. See [operations and capability
limitations](docs/reference.md) for secrets, deployment, app behavior and exceptions.

The applications are Jessages (verified messaging), Rainbow Hour (solar/weather
alerts), Lightsfinder (community sightings and driving loops), and Crunch Time
(manual workout tracking with optional motion sensing). Native sensors, passkeys,
push and installation require browser support; their core alternatives remain
usable without JavaScript. Reports are written to `playwright-report/`.

Lightsfinder's map opens zoomed out; **Use my location** finds nearby decorations.
The map supports mouse, pen, touch dragging, pinch/wheel zoom, and keyboard navigation.
Location permission is optional: native map links also work without JavaScript.
Searches, shared sightings, and drive starting points use browser location or the
selected map center; coordinates are carried in hidden fields, never typed.

`rpg-actor` renders the home/About sprite and has a playground at
`/components/rpg-actor/`. Its portable package accepts sprite URLs and expression
sheet URLs through attributes; see its README and Custom Elements Manifest.
The server reads optional emote blobs from the owner's public AT Protocol record
and serves them through the existing allow-listed image proxy. The owner must
publish the rpg.actor emote upgrade before their expressions appear. The home
page uses the build snapshot; About and the playground refresh public records.

About opts into `showcase` cycling; home actors keep their selected pose. Set
`showcase-duration="3000"` for three seconds per idle/walking/talking pose,
independently of the `interval` frame speed. Pause and reduced motion stop cycling.
