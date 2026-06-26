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
4. **One template source.** Build and Worker import the same template functions from `shared/`. Never maintain two copies of markup.
5. **JavaScript with JSDoc.** `.js`/`.mjs` with JSDoc annotations. `tsc --checkJs --strict --noEmit` for type checking. No `.ts` transpile step.
6. **Preview isolation.** Every branch gets its own preview URL bound to `site-preview`, never production data.

---

## Architecture

Three layers share one core: `shared/` holds templates, the `html` helper, route definitions, and data-access functions, imported by both `build/` (SSG) and `worker/` (runtime). The build renders static HTML to `dist/client/`; the Worker handles dynamic routes and falls through to `env.ASSETS` for everything else. If `env.ASSETS.fetch()` returns a `404`, the Worker must intercept it and return the static `dist/client/404.html` page with a `404` status code. Never expose the raw Cloudflare asset `404` response.

---

## Templating rules

Templates in `shared/templates/` are plain `(data) => Raw` functions using the `html` tagged template from `shared/html.js`. The helper auto-escapes all interpolations; pass `new Raw(...)` only for already-trusted nested template output.

- Never concatenate untrusted data into HTML outside the `html` helper.
- Templates are pure functions — no global state, no DOM access (they run in both build and Worker).
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

If a hypermedia library is ever needed, **htmx** is the only acceptable candidate. Default to hand-rolled first; introduce htmx only if the PR description contains the exact line: `Approved: use htmx` added by a human reviewer. Do not add this line yourself.

---

## Data layer (D1)

All DB access goes through `shared/data/` behind a small interface — call sites never touch the driver directly. Always use prepared statements: `env.DB.prepare(sql).bind(...args)`. Never string-interpolate user input into SQL. If a `shared/data/` function throws, the Worker must catch the error, log it to `console.error`, and return a `500` response rendered with the standard error page template. Never let an unhandled D1 error propagate as an unformatted Cloudflare error response. Do not expose raw error messages to the client.

Two physical databases, one binding name (`DB`):

- `site-production` — default (production) environment.
- `site-preview` — `--env preview`, shared by **all** branch/preview deployments.

**Known limitation:** D1 has no per-branch database branching today. All previews share `site-preview` — isolated from production but not from each other. Treat `site-preview` as disposable shared scratch state; never assume exclusive ownership.

---

## Deployments and migrations

Workers Builds (native git integration) handles deploys — no hand-rolled CI needed:

- `main` → production, binds `site-production`.
- Any other branch → preview with `--env preview`, binds `site-preview`. Produces a stable branch preview URL posted to the PR.

`scripts/deploy.js` selects the environment and applies migrations before deploy (`wrangler d1 migrations apply`). Migrations live in `db/migrations/` as plain SQL in order. `db/schema.sql` is the canonical schema reference. Write only additive migrations (new tables, new nullable columns, new indexes). Never drop columns, rename columns, or change column types in a single migration while other branches are under review. Use a separate follow-up migration after all affected branches merge.

---

## Coding standards

- **CSS:** native nesting, `@layer` for cascade control, custom properties for theming. No preprocessor.
- **Accessibility:** semantic HTML, real headings/landmarks, labelled controls, visible focus states, keyboard operability. The no-JS baseline must be fully accessible.
- **Semantic elements over ARIA roles.** Use the native element a role implies — `<ul>`/`<li>` not `<div role="list">`/`<div role="listitem">`, `<button>` not `<a>`/`<div>` with a click handler, `<nav>` not `<div role="navigation">`. An explicit `role` on an element that already has a conflicting implicit role (e.g. `role="listitem"` on an `<a>`) overrides the implicit one and breaks assistive-tech and `getByRole` queries. Only reach for an ARIA role when no native element provides it (`role="status"`, `role="alert"`, `role="log"`, `role="region"` are fine on a `<div>` — there's no native equivalent).
- **Tag/structural selectors over classes.** A classname adds a selector that must be kept in sync with the markup forever, and stacking enough of them is how CSS specificity bloat and drifting one-off variants happen. Before adding a class, check whether the element is already uniquely selectable by tag (`section`, `nav`, `time`), structural position (`nav > a:first-child`, `p:first-of-type`), or an existing semantic/state attribute (`[role="alert"]`, `[aria-current="page"]`, a `data-*` attribute the component already sets). Reach for a class only when none of those apply — e.g. a custom element needs a JS hook for `querySelector` (and the class isn't *also* duplicating a tag selector that already targets the same element), or the same tag needs genuinely different treatment in different places that markup position can't express (`.btn`, `.btn--outline` — applied to both `<a>` and `<button>` across unrelated contexts). When you do add a state-variant class, check first whether the component already tracks that state in a `data-*` attribute (e.g. `dataset.sent`) — style off that instead of inventing a parallel class for the same fact. Before introducing a new class, grep for an existing rule with the same properties — a near-duplicate ruleset under a different selector (`.button` aliasing `.btn`, a second `.chat-view` block duplicating the `chat-view` tag rule) is the bloat this rule exists to prevent.
- **Security:** all dynamic HTML through the `html` helper. Set CSP and standard security headers from the Worker. Parameterize every query.
- **Performance:** static-first, minimal JS, lazy/defer enhancement modules. Let View Transitions + Speculation Rules do the perceived-speed work.
- **Dependencies:** each new runtime dependency requires justification in the PR description. Default answer is "use the platform."

---

## Testing

### Philosophy

Unit tests are not used in this repository, including for shared template functions. Every test is an end-to-end functional test exercising real use cases through real browsers pointed at the deployed preview URL.

- **E2E only.** No mocks, no unit tests, no local dev server. If it doesn't run against the deployed preview, it doesn't run.
- **Real servers.** Tests target the Cloudflare preview URL (`PREVIEW_URL` env var). Set this to the branch preview URL before running. Never point tests at `localhost`.
- **Shared preview state.** Because `site-preview` is shared, all E2E tests must be state-independent: create unique test data with random identifiers (e.g., `crypto.randomUUID()`) at test start, assert only on that specific data, and delete it in `afterEach`. Tests must never assert on total record counts or assume a clean database state.
- **Semantic/ARIA selectors.** Use `getByRole`, `getByLabel`, `getByText`. Never select by CSS class or `data-testid`. This simultaneously validates accessibility and functionality.
- **Minimum assertions.** Assert only what a user would notice. Never test implementation details or internal state.
- **Progressive enhancement coverage.** Every test runs across four configurations automatically: Desktop Chrome (JS on), Desktop Chrome (JS off), Mobile Chrome (JS on), Mobile Chrome (JS off). A feature that only works with JS is broken.
- **Lighthouse scores.** Core pages must score ≥ 90 in Performance, Accessibility, Best Practices, and SEO. Lighthouse tests run on Desktop Chrome only (skipped in other projects).

### Running tests

```sh
PREVIEW_URL=https://your-branch.jessehattabaugh-com.workers.dev npx playwright test
```

Reports are written to `playwright-report/`.

The Playwright global setup must assert that `process.env.PREVIEW_URL` is set and matches `https://*.workers.dev`. If missing or malformed, throw an error with the message: "PREVIEW_URL is not set. Run: export PREVIEW_URL=https://your-branch.jessehattabaugh-com.workers.dev" and abort the test run before any browser is launched.

### Tool

Playwright (`@playwright/test`). Tests live in `tests/`.

### Coverage requirements

Every named route gets:
1. A render test — h1 heading visible, main navigation links present.
2. A Lighthouse audit at Desktop Chrome.

Interactive flows (forms) get a full happy-path submission test in all four configurations.

---

## Definition of done

- [ ] Works with JS disabled (core flows complete).
- [ ] Enhancement layer degrades gracefully (feature-detected, falls back).
- [ ] Dynamic responses share templates with the static build (no duplicated markup).
- [ ] Correct HATEOAS controls and HTTP semantics.
- [ ] `tsc` clean; tests pass.
- [ ] Preview deployment binds `site-preview`, not production — verified before merging.
- [ ] All HTML escaped; queries parameterized; security headers set.
- [ ] Any doc contradiction or assumption flagged in PR description.

---

## Cloudflare docs

The platform moves fast. Before relying on any wrangler config key, binding behavior, or quota, fetch `https://developers.cloudflare.com/llms.txt` and the relevant product-specific `llms.txt`. Request doc pages in Markdown form (append `index.md` to the URL). For Cloudflare platform/API behavior, docs win — flag the discrepancy in your PR. For repository architecture and workflow rules in this file, this file remains authoritative.
