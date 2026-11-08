# AGENTS.md

Instructions for coding agents building this website. Read fully before writing code. Be terse, prefer the web platform over libraries.

---

## What we're building

A personal website on **Cloudflare Workers**: statically generated HTML/CSS/JS backed by HATEOAS API Workers that render dynamic responses from the same shared templates. Progressively enhanced — every page works with zero JS. Per-branch preview deployments on every PR.

No SPA framework, no client-side router, no build-time UI framework. If you reach for React/Vue/Svelte/Next/etc., you are doing it wrong.

---

## Project principles

1. **Web standards first.** Use platform APIs (`URLPattern`, `fetch`, `FormData`, `Request`/`Response`, History API, View Transitions, Speculation Rules) before any dependency. A dependency must justify its existence.
2. **Progressive enhancement.** No-JS baseline is the product. JS must never be required for core functionality. If a feature breaks without JS, it is broken.
3. **HATEOAS.** Responses carry their own controls — links and forms — describing valid next actions. Clients follow what the server gives them; they never hardcode endpoint knowledge.
4. **One template source.** Build and Worker import the same template functions from their owning modules (`shared/templates/` for build/server pages; `server/apps/<app>/templates.js` and `server/shared/templates/` for server-only views; `build/templates/` for static-only pages). Never maintain two copies of markup.
5. **JavaScript with JSDoc.** `.js`/`.mjs` with JSDoc annotations. `tsc --checkJs --strict --noEmit` for type checking. No `.ts` transpile step.
6. **Preview isolation.** Every branch deploys as a version with its own per-branch D1 database and a versioned preview URL, never production data.
7. **Environment variables.** Secrets and configuration are injected via the `.dev.vars` file. All required variables must be documented in `.dev.vars.example`. Never hardcode secrets or config in source code.

---

## Architecture

Top-level directories identify execution domains:

- `build/`: Node.js static generation, asset publishing, deployment/secrets commands. `build/shared/` contains Node configuration and branch-preview tooling reused by these commands and the test runner.
- `server/`: Cloudflare request/scheduled handlers, app persistence, server-only templates, and `server/db/` schema/migrations. `server/shared/` contains auth, HTTP, crypto, push, and identity persistence reused within the server.
- `client/`: everything shipped to browsers: app scripts, service workers, styles, manifests, images, and reusable components. Each app's `sw.js` stays beside its other client code in `client/apps/<app>/`. `client/shared/` contains code/assets reused across apps or browser contexts.
- `shared/`: modules actually used across build/server/client boundaries: build/server page templates, HTML escaping, route definitions, public AT Protocol reads, and server/browser Rainbow Hour calculations. Root sharing does not mean “used by two apps.”
- `test/`: deployed-preview browser suites; `test/shared/` contains test-only fixtures, database maintenance, and audit helpers.

Put runtime-specific reuse in that runtime's `shared/` directory. Keep app-specific server code under `server/apps/<app>/` and client code under `client/apps/<app>/`. Do not recreate top-level `apps/`, `site/`, `worker/`, `scripts/`, or `db/` directories. Root tool configuration remains at the root for automatic discovery; `wrangler.jsonc` points to `server/index.js` and `server/db/migrations`.

Templates execute where they render, rather than in the browser: public page templates used by Node and Cloudflare live in `shared/templates/pages/`; server-only app templates live in `server/apps/<app>/templates.js` and auth/install templates in `server/shared/templates/`. Static-only Apps, Colophon, component documentation, and 404 templates live in `build/templates/`. Browser assets formerly described as site/static/public assets belong in `client/`.

`build/build.js` renders HTML to `dist/client/`. `build/assets.js` explicitly maps browser source directories to stable public URLs and rebases relative ES-module imports. Never copy all of root `shared/` or `server/` into public assets. Source directory names are not URL contracts; preserve existing links, manifests, service-worker URLs/scopes, and offline caches when moving sources. The Worker handles dynamic routes and falls through to `env.ASSETS`. If `env.ASSETS.fetch()` returns a `404`, return the static `dist/client/404.html` page with a `404` status, never the raw Cloudflare asset response.

---

## Templating rules

Templates in `shared/templates/`, `build/templates/`, `server/shared/templates/`, and `server/apps/<app>/templates.js` are plain `(data) => Raw` functions using the `html` tagged template from `shared/html.js`. The helper auto-escapes all interpolations; pass `new Raw(...)` only for already-trusted nested template output.

- Never concatenate untrusted data into HTML outside the `html` helper.
- Templates are pure functions — no global state, no DOM access. Cross-runtime templates run in both build and Worker; runtime-specific templates stay in their owning domain.
- A fragment template must be a function called directly inside its parent page template function (e.g., `html` template output like `<main>${fragmentFn(data)}</main>`), so that `layout(fragment(data))` and `fragment(data)` alone both produce markup from a single shared code path. The Worker renders either `layout(fragment)` or the bare `fragment` based on request headers — same template either way.

---

## HATEOAS conventions

- **Links navigate, forms mutate.** No `onclick` navigation; use real `<a href>`.
- **Forms are affordances.** If the user can't perform an action, the server omits the form entirely.
- If the site has protected routes, authentication state is determined by a signed cookie. Unauthenticated requests to protected routes return `302` to `/login`. All authorization checks happen in the Worker before template rendering; templates receive only pre-authorized data and affordances.
- **Redirect-after-POST** (`303`). The no-JS path must never re-submit on reload.
- On validation failure, return `422 Unprocessable Entity` with the full page (or fragment) re-rendered and error messages inline in the form. Do not redirect on failure — the `303` rule applies only to successful mutations. The re-rendered form must include all previously submitted values to avoid data loss.
- **Content negotiation:** plain request → full HTML document; JS-enhanced request (e.g. `X-Fragment: true`) → bare fragment. Same URL, same template, two representations.
- Correct HTTP semantics throughout: proper methods, status codes (`404`, `409`, etc.), and `Location` headers.

---

## Progressive enhancement

The baseline (no JS) is full-page navigation via links and `<form>` POSTs. JS adds:

- **Cross-document View Transitions** via `@view-transition { navigation: auto; }` — no JS router needed.
- **Speculation Rules** for prerendering likely next pages.
- **Fetch-and-swap for fragments:**
	1. Check for `document.startViewTransition`, `fetch`, and `FormData` support; if any are missing, return immediately (no-op).
	2. Wrap the entire handler in `try/catch`; on any caught error, call `form.submit()` or follow `a.href` natively.
	3. Read `action`, `method`, and target selector exclusively from the element's HTML attributes.
	4. Send the fragment request header.
	5. Swap response HTML inside `document.startViewTransition`.

**No enhancement may introduce a code path the no-JS baseline doesn't already satisfy.** Enhancement changes *how fast/smooth*, never *whether it works*.

---

## Data layer (D1)

All DB access goes through `server/shared/data/` (identity) or `server/apps/<app>/data.js` (app-owned records) behind a small interface — call sites never touch the driver directly. Always use prepared statements: `env.DB.prepare(sql).bind(...args)`. Never string-interpolate user input into SQL. If a data-access function throws, the Worker must catch the error, log it to `console.error`, and return a `500` response rendered with the standard error page template. Never let an unhandled D1 error propagate as an unformatted Cloudflare error response. Do not expose raw error messages to the client.

One production database plus one disposable database per preview branch, all behind the single `DB` binding:

- `jessehattabaugh-com` — production, bound by the default environment.
- `jessehattabaugh-com-preview-<branch>` — one per non-`main` branch, created on demand by `build/deploy.js`.

**Known limitation:** D1 has no per-branch database branching natively, so `build/deploy.js` creates a dedicated database per branch (named after the branch) to isolate preview state. These per-branch databases are disposable scratch state; delete them when the branch merges. Preview versions run on the production Worker and therefore share its secrets.

---

## Deployments and migrations

Workers Builds (native git integration) handles deploys — no hand-rolled CI needed:

- `main` → production. `wrangler deploy` promotes the version and binds `jessehattabaugh-com`.
- Any other branch → `wrangler versions upload --preview-alias <branch>`, which creates a version with a **stable, branch-scoped preview URL** (`<branch>-jessehattabaugh-com.<subdomain>.workers.dev`) but does not promote it to production. The preview URL is posted to the PR.

`build/deploy.js` selects the environment, creates the per-branch D1 database, applies migrations (`wrangler d1 migrations apply`), and uploads the preview version with a per-branch alias — all automatically on each build. Migrations live in `server/db/migrations/` as plain SQL in order. `server/db/schema.sql` is the canonical schema reference. Write only additive migrations (new tables, new nullable columns, new indexes). Never drop columns, rename columns, or change column types in a single migration while other branches are under review. Use a separate follow-up migration after all affected branches merge.

The preview URL is derived automatically — see the `test` npm script, which constructs `https://<branch>-jessehattabaugh-com.<subdomain>.workers.dev` from the current git branch so you never copy it by hand.

---

## Coding standards

- **CSS:** native nesting, `@layer` for cascade control, custom properties for theming. No preprocessor.
- **Accessibility:** semantic HTML, real headings/landmarks, labelled controls, visible focus states, keyboard operability. The no-JS baseline must be fully accessible.
- **Semantic elements over ARIA roles.** Use the native element a role implies — `<ul>`/`<li>` not `<div role="list">`/`<div role="listitem">`, `<button>` not `<a>`/`<div>` with a click handler, `<nav>` not `<div role="navigation">`. An explicit `role` on an element that already has a conflicting implicit role (e.g. `role="listitem"` on an `<a>`) overrides the implicit one and breaks assistive-tech and `getByRole` queries. Only reach for an ARIA role when no native element provides it (`role="status"`, `role="alert"`, `role="log"`, `role="region"` are fine on a `<div>` — there's no native equivalent).
- **Tag/structural selectors over classes.** A classname adds a selector that must be kept in sync with the markup forever, and stacking enough of them is how CSS specificity bloat and drifting one-off variants happen. Before adding a class, check whether the element is already uniquely selectable by tag (`section`, `nav`, `time`), structural position (`nav > a:first-child`, `p:first-of-type`), or an existing semantic/state attribute (`[role="alert"]`, `[aria-current="page"]`, a `data-*` attribute the component already sets). Reach for a class only when none of those apply — e.g. a custom element needs a JS hook for `querySelector` (and the class isn't *also* duplicating a tag selector that already targets the same element), or the same tag needs genuinely different treatment in different places that markup position can't express (`.btn`, `.btn--outline` — applied to both `<a>` and `<button>` across unrelated contexts). When you do add a state-variant class, check first whether the component already tracks that state in a `data-*` attribute (e.g. `dataset.sent`) — style off that instead of inventing a parallel class for the same fact. Before introducing a new class, grep for an existing rule with the same properties — a near-duplicate ruleset under a different selector (`.button` aliasing `.btn`, a second `.chat-view` block duplicating the `chat-view` tag rule) is the bloat this rule exists to prevent.
- **Security:** all dynamic HTML through the `html` helper. Set CSP and standard security headers from the Worker. Parameterize every query.
- **Performance:** static-first, minimal JS, lazy/defer enhancement modules. Let View Transitions + Speculation Rules do the perceived-speed work.
- **Runtime boundaries:** browser main-thread and service-worker code have separate TypeScript projects, even though app files are colocated. `npm run check` checks Cloudflare, Node/build, browser, and service-worker contexts. ESLint rejects runtime-inappropriate globals and imports; runtime-neutral modules cannot import a specific runtime.
- **Dependencies:** each new runtime dependency requires justification in the PR description. Default answer is "use the platform."

---

## Testing

### Philosophy

Unit tests are not used in this repository, including for shared template functions. Every test is an end-to-end functional test exercising real use cases through real browsers pointed at the deployed preview URL.

- **E2E only.** No mocks, no unit tests, no local dev server. If it doesn't run against the deployed preview, it doesn't run.
- **Real servers.** Tests target the versioned preview URL (`PREVIEW_URL` env var). Set this to the branch's version preview URL before running (find it in the dashboard under the version, or in the PR comment). Never point tests at `localhost`.
- **State independence.** Each branch has its own D1 database, but E2E tests must still be state-independent: create unique test data with random identifiers (e.g., `crypto.randomUUID()`) at test start, assert only on that specific data, and delete it in `afterEach`. Tests must never assert on total record counts or assume a clean database state.
- **Semantic/ARIA selectors.** Use `getByRole`, `getByLabel`, `getByText`. Never select by CSS class or `data-testid`. This simultaneously validates accessibility and functionality.
- **Minimum assertions.** Assert only what a user would notice. Never test implementation details or internal state.
- **Progressive enhancement coverage.** Every test runs across four configurations automatically: Desktop Chrome (JS on), Desktop Chrome (JS off), Mobile Chrome (JS on), Mobile Chrome (JS off). A feature that only works with JS is broken.
- **Lighthouse scores.** Core pages must score ≥ 90 in Performance, Accessibility, Best Practices, and SEO. Lighthouse tests run on Desktop Chrome only (skipped in other projects).

### Running tests

```sh
PREVIEW_URL=https://<version-prefix>-jessehattabaugh-com.<subdomain>.workers.dev npx playwright test
```

Reports are written to `playwright-report/`.

The Playwright global setup must assert that `process.env.PREVIEW_URL` is set and matches `https://*.workers.dev`. If missing or malformed, throw an error with the message: "PREVIEW_URL is not set. Run: export PREVIEW_URL=https://<version-prefix>-jessehattabaugh-com.<subdomain>.workers.dev" and abort the test run before any browser is launched.

### Tool

Playwright (`@playwright/test`). Tests live in `test/apps/`, `test/site/`, and `test/platform/`; test-only database maintenance belongs in `test/shared/`.

### Coverage requirements

Every named route gets:
1. A render test — h1 heading visible; site pages show main navigation, app pages show the compact site icon and account controls.
2. A Lighthouse audit at Desktop Chrome.

Interactive flows (forms) get a full happy-path submission test in all four configurations.

---

## Definition of done

- [ ] Works with JS disabled (core flows complete).
- [ ] Enhancement layer degrades gracefully (feature-detected, falls back).
- [ ] Dynamic responses share templates with the static build (no duplicated markup).
- [ ] Correct HATEOAS controls and HTTP semantics.
- [ ] `tsc` clean; tests pass.
- [ ] Preview deployment is a version (not promoted to production) using a per-branch D1 database — verified before merging.
- [ ] All HTML escaped; queries parameterized; security headers set.
- [ ] Any doc contradiction or assumption flagged in PR description.

---

## Cloudflare docs

The platform moves fast. Before relying on any wrangler config key, binding behavior, or quota, fetch `https://developers.cloudflare.com/llms.txt` and the relevant product-specific `llms.txt`. Request doc pages in Markdown form (append `index.md` to the URL). For Cloudflare platform/API behavior, docs win — flag the discrepancy in your PR. For repository architecture and workflow rules in this file, this file remains authoritative.

## RPG Actor integration

Always consult https://rpg.actor/dev-guide when implementing, changing, or
reviewing the RPG Actor integration. It is the authoritative source for sprite
records, grid/frame order, emote and talk sheets, and API behavior. Do not rely
on remembered formats or this repository's documentation when they disagree
with the current guide. Keep the component manifest, examples, and deployed
browser coverage aligned with that guide.
