# AGENTS.md

Instructions for coding agents building this website. Read fully before writing code. Be terse, prefer the web platform over libraries.

---

## What we're building

A personal website on **Cloudflare Workers**: statically generated HTML/CSS/JS backed by HATEOAS API Workers that render dynamic responses from the same shared templates. Progressively enhanced — every page works with zero JS. Per-branch preview deployments on every PR.

No SPA framework, no client-side router, no build-time UI framework. If you reach for React/Vue/Svelte/Next/etc., you are doing it wrong.

---

## Non-negotiable principles

1. **Web standards first.** Use platform APIs (`URLPattern`, `fetch`, `FormData`, `Request`/`Response`, History API, View Transitions, Speculation Rules) before any dependency. A dependency must justify its existence.
2. **Progressive enhancement.** No-JS baseline is the product. JS must never be required for core functionality. If a feature breaks without JS, it is broken.
3. **HATEOAS.** Responses carry their own controls — links and forms — describing valid next actions. Clients follow what the server gives them; they never hardcode endpoint knowledge.
4. **One template source.** Build and Worker import the same template functions from `shared/`. Never maintain two copies of markup.
5. **JavaScript with JSDoc.** `.js`/`.mjs` with JSDoc annotations. `tsc --checkJs --strict --noEmit` for type checking. No `.ts` transpile step.
6. **Preview isolation.** Every branch gets its own preview URL bound to `site-preview`, never production data.

---

## Architecture

Three layers share one core: `shared/` holds templates, the `html` helper, route definitions, and data-access functions, imported by both `build/` (SSG) and `worker/` (runtime). The build renders static HTML to `dist/client/`; the Worker handles dynamic routes and falls through to `env.ASSETS` for everything else.

---

## Templating rules

Templates in `shared/templates/` are plain `(data) => Raw` functions using the `html` tagged template from `shared/html.js`. The helper auto-escapes all interpolations; pass `new Raw(...)` only for already-trusted nested template output.

- Never concatenate untrusted data into HTML outside the `html` helper.
- Templates are pure functions — no global state, no DOM access (they run in both build and Worker).
- A fragment template must be a literal subtree of its page template. The Worker renders either `layout(fragment)` or the bare `fragment` based on request headers — same template either way.

---

## HATEOAS conventions

- **Links navigate, forms mutate.** No `onclick` navigation; use real `<a href>`.
- **Forms are affordances.** If the user can't perform an action, the server omits the form entirely.
- **Redirect-after-POST** (`303`). The no-JS path must never re-submit on reload.
- **Content negotiation:** plain request → full HTML document; JS-enhanced request (e.g. `X-Fragment: true`) → bare fragment. Same URL, same template, two representations.
- Correct HTTP semantics throughout: proper methods, status codes (`404`, `409`, etc.), and `Location` headers.

---

## Progressive enhancement

The baseline (no JS) is full-page navigation via links and `<form>` POSTs. JS adds:

- **Cross-document View Transitions** via `@view-transition { navigation: auto; }` — no JS router needed.
- **Speculation Rules** for prerendering likely next pages.
- **Fetch-and-swap for fragments:** intercept submits/clicks, send fragment header, swap result using `document.startViewTransition`. Must feature-detect, no-op if APIs missing, and fall back to native navigation on any error. Read action/method/target from the markup — never from hardcoded config.

**No enhancement may introduce a code path the no-JS baseline doesn't already satisfy.** Enhancement changes *how fast/smooth*, never *whether it works*.

If a hypermedia library is ever needed, **htmx** is the only acceptable candidate. Default to hand-rolled first; introduce htmx only with explicit human sign-off.

---

## Data layer (D1)

All DB access goes through `shared/data/` behind a small interface — call sites never touch the driver directly. Always use prepared statements: `env.DB.prepare(sql).bind(...args)`. Never string-interpolate user input into SQL.

Two physical databases, one binding name (`DB`):

- `site-production` — default (production) environment.
- `site-preview` — `--env preview`, shared by **all** branch/preview deployments.

**Known limitation:** D1 has no per-branch database branching today. All previews share `site-preview` — isolated from production but not from each other. Treat `site-preview` as disposable shared scratch state; never assume exclusive ownership.

---

## Deployments and migrations

Workers Builds (native git integration) handles deploys — no hand-rolled CI needed:

- `main` → production, binds `site-production`.
- Any other branch → preview with `--env preview`, binds `site-preview`. Produces a stable branch preview URL posted to the PR.

`scripts/deploy.js` selects the environment and applies migrations before deploy (`wrangler d1 migrations apply`). Migrations live in `db/migrations/` as plain SQL in order. `db/schema.sql` is the canonical schema reference. Write migrations that don't break sibling branches mid-review — they all share `site-preview`.

---

## Coding standards

- **CSS:** native nesting, `@layer` for cascade control, custom properties for theming. No preprocessor.
- **Accessibility:** semantic HTML, real headings/landmarks, labelled controls, visible focus states, keyboard operability. The no-JS baseline must be fully accessible.
- **Security:** all dynamic HTML through the `html` helper. Set CSP and standard security headers from the Worker. Parameterize every query.
- **Performance:** static-first, minimal JS, lazy/defer enhancement modules. Let View Transitions + Speculation Rules do the perceived-speed work.
- **Dependencies:** each new runtime dependency requires justification in the PR description. Default answer is "use the platform."

---

## Testing

- **Unit:** template functions (assert rendered HTML/escaping), the `html` helper, route matching, data functions against a test database.
- **Integration:** Worker request→response per route, asserting status codes, redirects, and correct HATEOAS controls.
- **The no-JS path is a test target**, not an afterthought: assert core flows complete via plain form POSTs and `303` redirects.
- Prefer `vitest` with the Workers pool. Keep tests dependency-light.
- Run against a **local** D1 database, never `site-preview`. Tests must create and tear down their own state.

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

The platform moves fast. Before relying on any wrangler config key, binding behavior, or quota, fetch `https://developers.cloudflare.com/llms.txt` and the relevant product-specific `llms.txt`. Request doc pages in Markdown form (append `index.md` to the URL). If docs contradict this file, docs win — flag the discrepancy in your PR.
