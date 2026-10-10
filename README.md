# jessehattabaugh.com

Personal site and three installable web apps on Cloudflare Workers. Plain JavaScript
ES modules with JSDoc, native CSS, shared HTML templates, and D1. No UI framework
or runtime dependencies.

## Get oriented

- `shared/routes.js`: server URL vocabulary and static/dynamic route registry.
- `shared/templates/`: escaped HTML, shared by the build and Worker. App page
	functions call their fragment function directly; `X-Fragment: true` requests
	receive that fragment from the same URL.
- `build/build.js`: renders static pages to `dist/client/` and copies browser assets.
- `worker/index.js`: dispatches the registered dynamic routes, applies security
	headers, and serves assets with the custom 404 and standard error pages.
- `shared/data/`: all prepared D1 queries; `db/migrations/` changes the schema.
- `client/enhance/`: optional form/link transitions, installation, and Web Push.
- `client/apps/`: app enhancements and service workers.
- `tests/`: functional browser flows against an isolated deployed preview.

Home, About, Apps, and Colophon are static. `/contact` redirects to Messages.

**Platform accounts** live at `/login`, `/verify`, and `/account`.
Email links and passkeys share one signed, host-only session across apps. Account
settings own passkey enrollment, recovery email, owner setup, and sign-out.
Authentication lives in `worker/auth.js`, `shared/data/auth.js`,
`shared/templates/auth.js`, and `client/enhance/auth.js`. Confirmation pages use
the site layout; emails identify jessehattabaugh.com. The requesting app's
allow-listed return destination is stored with its verification token, so opening
email on another device still returns there. Generic sign-in opens account settings.
Previously sent Messages verification links and credential endpoints remain valid.
No schema migration or session reset is required.

**Messages** uses the shared platform account. Visitors can send
messages, sign in on another device, read history, and refresh replies without
JavaScript. The owner can select conversations and reply the same way.
Account settings offer passkeys, recovery email, and first-owner setup with
`OWNER_SETUP_TOKEN`. Existing account data and verified sessions are preserved.
Verification links display a confirmation form;
only its POST consumes the token or sends a held message.
Confirmation commits its database changes atomically, so failed publication can
be retried with the same link. Notification controls check server registration
for the current account before reporting alerts as enabled.
Push notifications carry bounded previews; message history retains the full text.
New email and passkey requests remove expired authentication records.
Legacy passkey accounts can still sign in and confirm a recovery email without
losing their conversations or owner role.

**Rainbow Hour** accepts manual coordinates for daily solar windows and live sky
checks with or without JavaScript. Manual weather checks run on the Worker using
Open-Meteo. Geolocation fills the same form. Alert checks run in the device's
service worker after a server wake push, using rounded coordinates in IndexedDB
and D1. The production cron checks eligible devices every 15 minutes.

## Work on it

Use Node.js 22 or newer and tabs for indentation.

```sh
npm ci
cp .dev.vars.example .dev.vars
# Fill the values needed for your task in .dev.vars.
npm run check
npm run build
```

`npm run check` checks Worker, build/scripts, and browser code. `dist/` is generated.
Do not run functional tests against a local server.

Regenerate the lockfile without an existing `node_modules` directory so optional
platform packages are preserved. Verify dependency changes with `npm ci`.

## Deploy and test a branch

Cloudflare Workers Builds runs `npm run deploy` for the checked-out branch.
For a manual preview, use a non-`main` branch:

```sh
npm run deploy:preview
npm test
```

Authenticate Wrangler with `npx wrangler login`, or set `CLOUDFLARE_API_TOKEN`
and `CLOUDFLARE_ACCOUNT_ID` in `.dev.vars`. Deployment creates/reuses an isolated preview D1 database,
applies migrations, and uploads a version without promoting production. The
preview config inherits email bindings and asset behavior from `wrangler.jsonc`
and resolves public settings from `.dev.vars`; production domains and cron triggers are omitted. Deployment
and tests share the alias calculation, including a hash when branch names need
normalization or truncation. Preview responses identify their database so tests
can reject a mismatched deployment before touching fixture data.

Production deployment is `npm run deploy:prod` on `main`. Neither that command
nor `deploy:preview` silently deploys the other environment. Delete disposable
preview databases when their branches merge. Preview versions share Worker
secrets, so use controlled addresses for test email. See Cloudflare's
[version URL documentation](https://developers.cloudflare.com/workers/versions-and-deployments/version-urls/).

Cloudflare Email Sending uses `notify.jessehattabaugh.com` and the sender
`no-reply@notify.jessehattabaugh.com`; root-domain incoming mail stays with Proton.
Configure the sending subdomain in Cloudflare Email Service and set the
Worker runtime secrets (documented in `.dev.vars.example`):

- `SESSION_SECRET`: random 32+ bytes, base64url encoded.
- `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`: generate with
	`node scripts/generate-vapid-keys.js`.
- `OWNER_SETUP_TOKEN`: one-time owner setup credential.

`EMAIL_FROM`, `VAPID_CONTACT`, and optional `OSRM_URL` in `.dev.vars` are
allow-listed into deployment configuration; `.dev.vars.example` supplies defaults.
Email delivery/configuration failures return the standard error page.

Tests run desktop/mobile Chrome with JS on/off; Lighthouse runs only in desktop
Chrome. Install Chromium once with `npx playwright install chromium`. The stateful
suites also require `E2E_CLOUDFLARE_API_TOKEN` with D1 read/write permissions,
`CLOUDFLARE_ACCOUNT_ID`, and `E2E_EMAIL_DOMAIN` in `.dev.vars` for a controlled
catch-all mailbox.
`npm test` automatically supplies `PREVIEW_URL`
and `PREVIEW_DB_NAME` from the current branch; no manual URL setup is needed. Set
`WORKERS_DEV_SUBDOMAIN` in `.dev.vars` for a different Cloudflare account. To target a particular
version, set `PREVIEW_URL` in `.dev.vars`. Reports go to `playwright-report/`.

Tests use unique identities, real email-binding calls, genuine confirmation
records from the preview D1 database, and cleanup of their own rows. Token
retrieval avoids an inbox-provider dependency; it does **not** verify inbox
arrival. Weather checks use the real service and document its unavailable state.
Push tests use the real browser push service and need working VAPID configuration
and push-service connectivity. They do not fake subscriptions or weather.

## Architecture exceptions

Email sign-in, history, replies, and manual sky checks are the no-JS baseline.
WebAuthn, geolocation, Web Push, and browser installation prompts intrinsically
require browser APIs; these optional capabilities are feature-detected, with
email sign-in/manual coordinates available throughout. Passkey credential
exchanges and optional push-registration status checks carry protocol JSON;
regular navigation and application mutations use
server-rendered links/forms and HTML. These capability exceptions narrow the
literal “every enhancement has a no-JS equivalent” rule in `AGENTS.md`.

Lighthouse skips the preview environment's `is-crawlable` audit because preview
URLs are intentionally not indexed. Error/confirmation endpoints are covered by
functional flows; Lighthouse covers the public pages and Lightsfinder’s four views.

## Lightsfinder

`/apps/lightsfinder/` offers a themed map, photo sightings, ratings/reports,
regional season standings, and budgeted driving loops. Server code lives in
`apps/lightsfinder/`; browser/PWA assets in `client/apps/lightsfinder/`.
Only cross-app infrastructure stays in `shared/`. Core forms work without JS;
GPS, resizing, sharing, and installation are optional enhancements.

Verified accounts can publish 10 sightings and upload 20 raster photos per day.
Photos are limited to 750 KB, stripped of metadata, and stored in isolated D1;
valid drafts survive field validation for 24 hours. Move photos to branch-isolated
R2 before large-scale usage. Historical sightings are marked as unconfirmed and
excluded from current driving plans. The default view starts in Seattle and
selects the upcoming fixed-date holiday; Other supports named festivals.

Maps use OpenStreetMap; routes use public OSRM. Set `OSRM_URL` for a self-hosted
HTTPS road service. Loops consider 20 candidate addresses/up to eight stops and
verify the actual return distance/time; they are approximate optimizations with
no live traffic. Service failures show a 503 retry form. Complete road directions
remain in the app if a navigation handoff omits mobile waypoints.

Awards use community-supplied regions and one averaged vote per account/address;
results can change with moderation and late submissions. Three distinct reports
quarantine spam or mark lights taken down. Authors can mark their own displays
taken down immediately; the existing site owner reviews `?view=moderation`.
The offline PWA shell explains connectivity needs and caches no private pages,
photos, or map tiles. See `tests/lightsfinder.test.js` for functional flows/errors.

## Environment configuration

Use the ignored `.dev.vars` file; copy `.dev.vars.example` for all documented
keys. Node commands and direct Playwright runs load it using Node's native dotenv
parser; no dependency or `.env` file is needed. Nonempty CI/environment values
take precedence, and empty example values are ignored by Node commands. Wrangler
reads `.dev.vars` for local development. Derived preview identity remains
automatic; tests reject production or mismatched fixture databases.

`node scripts/generate-vapid-keys.js` fills missing runtime secrets in
`.dev.vars` without printing or rotating existing values. For an existing
deployment, keep its current secret values; generating a new session key signs
users out if later deployed. `npm run secrets:upload` sends only the four
allow-listed runtime secrets to an **unpromoted** Cloudflare Worker version.
Select/deploy that version explicitly when ready. Ordinary app preview deploys
preserve the remote secrets. Cloudflare's deployed bindings are separate from
local files; editing `.dev.vars` alone cannot change a running Worker.
The D1-only `E2E_CLOUDFLARE_API_TOKEN` is separate from Wrangler deployment
credentials, so it cannot override OAuth login. A general `CLOUDFLARE_API_TOKEN`
can also supply fixtures when it has D1 permission. Tooling credentials and the
test mailbox domain are never uploaded.

Lightsfinder opts out of cross-document View Transitions because JS-disabled
Chromium left snapshots intercepting native controls in deployed tests. Its
optional fetch-and-swap form enhancement still uses View Transitions.
