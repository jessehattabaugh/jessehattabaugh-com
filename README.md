# jessehattabaugh.com

A personal site and four installable web apps built with JavaScript ES modules,
JSDoc, native CSS, and Cloudflare Workers/D1. Server-rendered links and forms are
the baseline; browser APIs add optional capabilities. No UI framework or runtime
package dependencies.

## Start here

1. Read [the architecture](docs/architecture.md) for ownership and request flow.
2. Follow one feature from `apps/<name>/worker.js` through `data.js` and
	`templates.js`, then its browser flows in `tests/apps/`.
3. See [the engineering review](docs/engineering-review.md) for strengths,
	tradeoffs, and remaining work. [AGENTS.md](AGENTS.md) defines contribution rules.

| Directory | Responsibility |
| --- | --- |
| `site/` | Public pages, static page registry, AT Protocol integration |
| `apps/<name>/` | App handlers, persistence, templates, and domain helpers |
| `shared/` | HTML escaping, routes, identity data, shared UI and cross-runtime algorithms |
| `worker/` | Runtime entrypoint, HTTP policy, authentication, crypto and Web Push |
| `client/` | Public browser modules, styles, manifests, icons and service workers |
| `build/` | Static generation and branding assets |
| `scripts/` | Configuration, deployment, secrets and branch-derived preview tooling |
| `db/` | Canonical schema and ordered additive migrations |
| `tests/` | Deployed-preview E2E suites grouped by app, site and platform |

## Develop and verify

Use Node.js 22+ and tabs. Copy `.dev.vars.example` to the ignored `.dev.vars`
if it does not already exist; fill only the settings required for your work.

```sh
npm ci
npm run check
npm run lint
npm run build
```

`dist/` is generated. `sharp` is a build-only dependency for correctly sized
icons; `globals` supplies ESLint’s environment definitions. Verify dependency
changes with a clean `npm ci`; do not rely on transitive packages.

On a non-`main` branch, authenticate Wrangler and run:

```sh
npm run deploy:preview
npm test
# Or one feature across desktop/mobile, with and without JavaScript:
npm test -- tests/apps/crunch-time.test.js
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
