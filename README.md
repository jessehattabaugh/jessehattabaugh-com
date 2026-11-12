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
| `server/` | Cloudflare Worker handlers, auth, HTTP, persistence, templates, and D1 schema/migrations |
| `client/` | Browser apps and their service workers, components, styles and enhancements. App helpers stay with their owning app |
| `shared/` | Cross-runtime modules: build/server rendering and social reads, routes, server/browser solar/weather logic |
| `test/` | Deployed-preview Playwright suites; fixtures and audit helpers in `test/shared/` |

`npm run build` uses Node and Hono to render the pages registered in
`shared/routes.js`, then publishes them with assets in `dist/client/`. Browser
files are copied byte-for-byte: native ES module imports, CSS imports, JSON,
images, manifests and service workers remain exactly as authored. Wrangler still
bundles/minifies server code. Sharp generates icons and social artwork separately. Documentation examples use
Highlight.js on the server. Client-created code blocks load the same self-hosted
ES modules on demand.

To add a page, write its template and add one entry to `shared/routes.js` with
its URL, template module/export, heading, and optional sitemap/navigation metadata.
That catalog drives static HTML, Worker dispatch, sitemap and route smoke tests.
For a new dynamic feature, bind its handler once in `server/index.js`; subsequent
URLs for that feature are declared in the catalog. Existing templates and forms
use the derived `paths` object, so URLs are never maintained in a second list.

`client/` mirrors public asset URLs: `client/apps/foo/app.js` is served at
`/apps/foo/app.js`. Use browser-valid imports and ordinary stylesheet/image URLs;
there is no build rewriting. Tool configurations and agent instructions are not
published. Rainbow Hour's browser storage stays in its app directory; its pure
server/browser calculations remain in `shared/rainbow-hour/` and are published
unchanged at that same path. Other shared/server/build modules remain private.

Web app manifests are named `manifest.webmanifest`. Baseline styles use native
stylesheet links and work without JavaScript. Navigation follows server-rendered
links and forms; Hono is a server/build dependency, never a browser dependency.
`SITE_ORIGIN` configures the canonical origin for `sitemap.xml` and `robots.txt`.
Only catalog entries explicitly marked `sitemap: true` are indexed.

### Web Analytics

The footer’s Web Counter shows the current page’s Cloudflare Web Analytics views
for the last 30 days. The Worker caches each URL path’s count for five minutes
per edge location. The site owner can open **Visitor analytics** from Jessages
to see site-wide 7- and 30-day reports.
Cloudflare can sample counts and only measures browsers that run its beacon.

Keep [Cloudflare's automatic beacon injection](https://developers.cloudflare.com/web-analytics/get-started/#sites-proxied-through-cloudflare)
enabled with EU visitor data excluded. Set `WEB_COUNTER_ACCOUNT_ID`,
`WEB_COUNTER_SITE_TAG`, and `WEB_COUNTER_API_TOKEN` in `.dev.vars` for local
development. For deployed reporting, upload all three as Worker secrets using
`npm run secrets:upload` after a production deployment. Verify the resulting
version binds the production D1 database before promoting it. Wrangler preserves
these bindings on subsequent deployments. The account-scoped API token needs
**Account Analytics Read**. Reporting is disabled on branch previews.

## Reusable components

`/components/` showcases standalone Custom Elements and kits. Each component lives in
`client/components/<tag>/` with ES modules, a Custom Elements Manifest, README,
and MIT license. The root package exports Web Counter at
`jessehattabaugh-com/components/web-counter`. Consumers can vendor a pinned
GitHub revision or use the published files from the catalog.
The catalog publishes kit dependencies alongside each kit’s import URLs.

[Game Kit](https://jessehattabaugh.com/components/game-kit/) ships from
`client/components/game-kit/`. Its tutorial and element references
include runnable graphics examples that reuse art from Aether Wing at
`/games/aether-wing/`, listed in the `/games/` showcase. Pattern banks, palettes, tilemaps, layers and
sprite records are declared in HTML. CSS supplies projection, scrolling,
palette and frame animations. Native controls support steering, targeting and
sector selection without scripting. JavaScript adds continuous input,
collision simulation and gamepad support. See the package README for the contract.

See the [component guidelines](client/components/AGENTS.md) for kits.
To add a standalone element, add its portable files under `client/components/`,
its catalog metadata in `build/component-catalog.js`, and a showcase template and
route entry. Cover its browser API in `test/site/`. Public files are discovered
from the directory tree; there is no asset entry-point list to update.

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
`/components/rpg-actor/`. The portable element accepts a Bluesky `handle` and
loads public sprite and expression sheets, with a bundled courier for missing
sprites. Site pages render a static portrait using declarative shadow DOM.
See the [component README](client/components/rpg-actor/README.md) for embedding
and explicit sheet overrides.

About opts into `showcase` cycling; home actors keep their selected pose. Set
`showcase-duration="3000"` for three seconds per idle/walking/talking pose,
independently of the `interval` frame speed. Pause and reduced motion stop cycling.
