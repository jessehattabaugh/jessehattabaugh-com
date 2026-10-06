# jessehattabaugh.com

Personal site and two installable web apps on Cloudflare Workers. Plain JavaScript
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

**Messages** uses email confirmation and signed cookies. Visitors can send
messages, sign in on another device, read history, and refresh replies without
JavaScript. The owner can select conversations and reply the same way. A signed-in
visitor can add a passkey; the first owner can claim the role with
`OWNER_SETUP_TOKEN`. Existing account data survives this change, but legacy
sessions must sign in again. Verification links display a confirmation form;
only its POST consumes the token or sends a held message.
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
npm run check
npm run build
```

`npm run check` checks Worker, build/scripts, and browser code. `dist/` is generated.
Do not run functional tests against a local server.

## Deploy and test a branch

Cloudflare Workers Builds runs `npm run deploy` for the checked-out branch.
For a manual preview, use a non-`main` branch:

```sh
npm run deploy:preview
npm run test:preview
```

Authenticate Wrangler or provide `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID`. Deployment creates/reuses an isolated preview D1 database,
applies migrations, and uploads a version without promoting production. The
preview config inherits email bindings, variables, and asset behavior from
`wrangler.jsonc`; production domains and cron triggers are omitted. Deployment
and tests share the alias calculation, including a hash when branch names need
normalization or truncation. Preview responses identify their database so tests
can reject a mismatched deployment before touching fixture data.

Production deployment is `npm run deploy:prod` on `main`. Neither that command
nor `deploy:preview` silently deploys the other environment. Delete disposable
preview databases when their branches merge. Preview versions share Worker
secrets, so use controlled addresses for test email. See Cloudflare's
[version URL documentation](https://developers.cloudflare.com/workers/versions-and-deployments/version-urls/).

Configure the email sending domain with Cloudflare Email Service and set the
Worker secrets:

- `SESSION_SECRET`: random 32+ bytes, base64url encoded.
- `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`: generate with
	`node scripts/generate-vapid-keys.js`.
- `OWNER_SETUP_TOKEN`: one-time owner setup credential.

`EMAIL_FROM` and `VAPID_CONTACT` are non-secret variables in `wrangler.jsonc`.
Email delivery/configuration failures return the standard error page.

Tests run desktop/mobile Chrome with JS on/off; Lighthouse runs only in desktop
Chrome. Install Chromium once with `npx playwright install chromium`. The stateful
suites also require `CLOUDFLARE_API_TOKEN` with D1 read/write permissions,
`CLOUDFLARE_ACCOUNT_ID`, and `E2E_EMAIL_DOMAIN` for a controlled catch-all mailbox.
`test:preview` supplies `PREVIEW_URL` and `PREVIEW_DB_NAME`; override
`WORKERS_DEV_SUBDOMAIN` for a different Cloudflare account. To target a particular
version, set `PREVIEW_URL` explicitly. Reports go to `playwright-report/`.

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
exchanges carry protocol JSON; regular navigation and application mutations use
server-rendered links/forms and HTML. These capability exceptions narrow the
literal “every enhancement has a no-JS equivalent” rule in `AGENTS.md`.

Lighthouse skips the preview environment's `is-crawlable` audit because preview
URLs are intentionally not indexed. Error/confirmation endpoints are covered by
functional flows; Lighthouse covers the seven public pages.
