# Architecture and ownership

## Follow a request

`shared/routes.js` defines URLs and permitted methods. `worker/index.js` applies
origin checks, dispatches to `site/worker.js`, an app’s `worker.js`, or the shared
auth handler, then adds security/cache headers. Unhandled data errors become the
standard error page; missing static assets become the custom 404.

Handlers authorize and validate before rendering. They call data modules with
prepared statements and pass authorized values/affordances into pure templates.
A template renders a fragment inside a full page, or the same fragment alone for
`X-Fragment: true`. Successful forms redirect with 303; validation responses
retain entered values. `client/enhance/` follows the form’s existing controls and
falls back to native submission/navigation when enhancement fails.

`build/build.js` renders `site/pages.js` using those same template functions,
saves the public social snapshot, copies public assets, and generates branding.
It does not bundle app server code into the public asset directory.

## Put code with its owner

- `apps/<name>/worker.js`: app request orchestration and authorization.
- `apps/<name>/data.js`: app-owned persistence. Lightsfinder adds focused model,
	photo, and route-planning modules; Rainbow Hour also owns its scheduled job.
- `apps/<name>/templates.js`: pure page and fragment functions.
- `site/`: public content, external social-data access, and public page templates.
- `shared/data/accounts.js`, `passkeys.js`, `email-verification.js`: identity
	persistence shared across apps. App-independent imports no longer come from a
	module called `messages.js`.
- `worker/auth/`, `worker/http/`, `worker/crypto/`, `worker/push/`: server-only
	infrastructure, named by responsibility. `worker/index.js` is the composition root.
- `client/apps/<name>/`: public assets, intentionally separate from server code.
	Keeping this boundary preserves manifest URLs, service-worker scope, and bookmarks.
- `tests/apps/`, `tests/site/`, `tests/platform/`: browser-visible behavior by owner.
	`tests/helpers/` owns fixture maintenance; production code never imports tests.

Keep direct imports; do not add barrels that conceal cross-domain dependencies.
Templates must not import Worker handlers or browser globals. Shared modules
must not import application or site implementations. The shared layout accepts
only the profile fields it renders rather than importing the whole social model.

## Deliberate exceptions

Email proof, account verification, and held-message approval currently form a
single D1 transaction in `shared/data/email-verification.js`. Its SQL crosses the
identity/messages boundary intentionally. The auth handler also coordinates
message notification after commit. A future decoupling needs transactional design
and replay/error tests; moving those writes into independent calls would weaken
consistency. No transaction or schema behavior changed in this reorganization.

`shared/solar.js`, `rainbow.js`, and `weather.js` are shared between the Worker and
browser/service-worker runtimes. Their `/shared/*.js` URLs are kept stable for
installed Rainbow Hour workers. This is runtime sharing, not a claim that every
app uses those algorithms. Add no unrelated app code there.

Runtime types stay separate: Worker, Node/build, and browser code each have their
own TypeScript project. App templates/data are included explicitly where needed.
ESLint checks shared/template dependency boundaries; `npm run lint` fails on warnings.

## Change a feature

Update its owning handler/data/template and its deployed browser flow together.
Keep public URLs in `shared/routes.js`, schema changes additive in `db/migrations/`,
and configuration documented in `.dev.vars.example`. Preserve no-JS behavior,
inline validation, cleanup of unique test records, and semantic selectors.

Run type checks, lint and build, then deploy the non-main branch and run its E2E
suite. Broader changes to routing, identity or shared rendering require all suites.
Document browser-only capabilities and external-service failures in those tests.
