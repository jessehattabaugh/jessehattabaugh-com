# AGENTS.md

Instructions for coding agents building this website. Read this fully before writing code. Be terse, follow the constraints, and prefer the web platform over libraries.

> Note: this file is named `AGENTS.md` (uppercase) because that is the filename agent tooling looks for. Keep it at the repo root.

---

## 1. What we're building

A personal website hosted entirely on **Cloudflare Workers**. The site is:

- **Statically generated** HTML/CSS/JS for everything that can be known at build time.
- Backed by **HATEOAS API Workers** that render dynamic responses **from the same HTML templates** used at build time.
- **Progressively enhanced**: every page and action works with zero client JS, then improves when JS and modern browser APIs are available.
- Deployed with **per-branch preview deployments** and **per-branch database branches**, so every PR is a fully isolated, clickable environment.

There is no SPA framework, no client-side router, and no build-time UI framework. If you reach for React/Vue/Svelte/Next/etc., you are doing it wrong.

---

## 2. Non-negotiable principles

1. **Web standards first.** Use platform APIs (`URLPattern`, `fetch`, `FormData`, `Request`/`Response`, `URL`, History API, View Transitions, Speculation Rules) before reaching for any dependency. A dependency must justify its existence.
2. **Progressive enhancement.** The no-JS baseline is the product. JS is an enhancement layer that must never be required for core functionality. If a feature breaks without JS, it is broken.
3. **HATEOAS.** API responses are hypermedia. They carry their own controls — links (`<a>`) and forms (`<form>`) — describing what the client can do next. Clients do not hardcode endpoint knowledge or construct URLs from out-of-band API docs; they follow what the server gives them.
4. **One template source.** The build step and the runtime Worker import the **same** template functions. Never maintain two copies of markup.
5. **JavaScript with JSDoc.** Author in `.js`/`.mjs` with JSDoc type annotations. Run `tsc` in `checkJs` mode for type checking. Do not introduce a `.ts` toolchain or a transpile step for types.
6. **Isolated previews.** Every branch gets its own preview URL and its own database branch. Previews must never read or write production data.

---

## 3. Architecture

Three layers, one shared core:

```
                 ┌─────────────────────────────┐
                 │   shared/ (templates, html  │
                 │   helper, types, data fns)  │
                 └───────────┬─────────────────┘
                             │ imported by both
              ┌──────────────┴───────────────┐
              ▼                               ▼
   ┌────────────────────┐         ┌──────────────────────┐
   │ build/ (SSG)       │         │ worker/ (runtime)    │
   │ renders static     │         │ HATEOAS API +        │
   │ HTML at build time │         │ dynamic fragments    │
   │ → dist/client/     │         │ → dist/server/       │
   └────────────────────┘         └──────────────────────┘
              │                               │
              ▼                               ▼
        static assets ───────────────► one Cloudflare Worker
        served from edge                serves assets + dynamic routes
```

- **Static layer:** A build script renders every known page to a static HTML file in `dist/client/`. CSS and progressive-enhancement JS are plain files copied/bundled into `dist/client/`.
- **Dynamic layer:** A single Worker (`dist/server/`) handles dynamic routes (form POSTs, fragment fetches, anything depending on request/DB state) and serves the static assets for everything else.
- **Shared core:** Template functions, the `html` helper, route definitions, and data-access functions live in `shared/` and are imported by **both** build and worker. This is what makes "API workers share HTML templates with the frontend" true rather than aspirational.

---

## 4. Repository layout

```
.
├── AGENTS.md
├── package.json
├── wrangler.jsonc
├── tsconfig.json              # checkJs, no emit; types only
├── shared/
│   ├── html.js                # tagged-template html`` helper (auto-escaping)
│   ├── templates/             # (data) => string template functions
│   │   ├── layout.js
│   │   ├── home.js
│   │   └── ...
│   ├── routes.js              # URLPattern definitions, shared build+worker
│   ├── data/                  # data-access functions (DB queries)
│   └── types.js               # @typedefs
├── build/
│   └── build.js               # SSG: render templates → dist/client/*.html
├── worker/
│   └── index.js               # Worker entry (fetch handler, URLPattern routing)
├── client/
│   ├── styles/                # CSS (layers, nesting, view-transition rules)
│   └── enhance/               # progressive-enhancement JS modules
├── db/
│   ├── schema.sql
│   └── migrations/
├── scripts/
│   └── deploy.js              # per-branch deploy + DB branch orchestration
└── dist/                      # build output (gitignored)
    ├── client/
    └── server/
```

---

## 5. Templating and template sharing

Templates are **plain functions** `(data) => string` that return HTML. No JSX, no virtual DOM.

`shared/html.js` exposes a tagged template literal that **escapes interpolations by default** and allows opt-in raw insertion of already-trusted HTML (e.g. nested template output):

```js
// shared/html.js
/** Marks a string as already-safe HTML so it is not re-escaped. */
export class Raw {
  /** @param {string} value */
  constructor(value) { this.value = value; }
}

/** @param {string} s */
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

/**
 * Auto-escaping HTML tagged template. Returns a Raw so templates can nest.
 * @param {TemplateStringsArray} strings
 * @param {...(string | number | Raw | Array<string | Raw>)} values
 * @returns {Raw}
 */
export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    const arr = Array.isArray(v) ? v : [v];
    out += arr.map((x) =>
      x instanceof Raw ? x.value : escapeHtml(String(x))
    ).join("");
    out += strings[i + 1];
  }
  return new Raw(out);
}

/** Render a Raw (or string) to a final HTML string. */
export const render = (/** @type {Raw | string} */ node) =>
  node instanceof Raw ? node.value : escapeHtml(String(node));
```

Template functions return `Raw` and compose:

```js
// shared/templates/home.js
import { html } from "../html.js";
import { layout } from "./layout.js";

/**
 * @param {{ posts: Array<{ slug: string, title: string }> }} data
 */
export const home = (data) => layout({
  title: "Home",
  body: html`
    <h1>Posts</h1>
    <ul>
      ${data.posts.map((p) => html`<li><a href="/posts/${p.slug}">${p.title}</a></li>`)}
    </ul>
  `,
});
```

The **build step** calls `home({...})` to write a static file. The **Worker** calls the same `home({...})` (or a sub-template) to render a live response. Identical markup, guaranteed.

**Rules:**
- Never concatenate untrusted data into HTML outside the `html` helper.
- Templates are pure functions of their data. No global state, no DOM access (they run in build, Worker, and have no `window`).
- A template that renders a full page and a template that renders a fragment should share their inner pieces, so a fragment is literally a subtree of the page.

---

## 6. HATEOAS conventions

Responses are hypermedia documents. The client discovers available actions from the markup, not from external knowledge.

- **Links are navigation.** Use real `<a href>` for anything that changes the displayed resource. No `<div onclick>` navigation.
- **Forms are actions.** State changes use `<form method="post" action="...">`. The form's presence in a response *is* the affordance; if the current user can't perform an action, the server omits the form.
- **Responses are self-describing.** A resource response includes the controls for its valid next states (edit form, delete form, links to related resources). Do not require the client to know "after X, call Y."
- **Content negotiation drives full-page vs fragment.** Same URL, two representations:
  - Normal navigation / no-JS form submit → return a **full HTML document**.
  - Enhanced request (JS sets a header, e.g. `Accept: text/fragment+html` or a custom `X-Fragment: true`) → return **just the fragment** to swap in.
  - The Worker branches on the request header and renders either `layout(fragment)` or the bare `fragment` — same template either way.
- **HTTP semantics are the contract.** Correct methods, status codes (`303` after POST, `404`, `409`, etc.), and `Location` headers. Redirect-after-POST so the no-JS path never re-submits.

---

## 7. Progressive enhancement layer

The baseline works with HTML alone. The `client/enhance/` modules add behavior on top, using modern platform APIs (early adoption encouraged where support + graceful fallback exist).

**Baseline (no JS):** Full-page navigation via links. Forms POST and the server responds with `303` + full page. Everything functions.

**Enhancement (JS available):**
- **Cross-document View Transitions** for SPA-like navigation with zero JS routing. Prefer the declarative CSS form so it works on plain navigation:
  ```css
  @view-transition { navigation: auto; }
  ```
  This animates real navigations between statically generated pages. No router required.
- **Speculation Rules API** for instant loads — prerender/prefetch likely next pages:
  ```html
  <script type="speculationrules">
  { "prerender": [{ "where": { "href_matches": "/*" }, "eagerness": "moderate" }] }
  </script>
  ```
- **Fetch-and-swap for fragments (optional, HATEOAS-aware):** A small module may intercept form submits / link clicks, send the fragment header, and swap the returned fragment into the DOM using the View Transitions JS API (`document.startViewTransition`). It must:
  - Feature-detect and no-op if APIs are missing.
  - Fall back to native submit/navigation on any error.
  - Read the action/method/target **from the markup** (HATEOAS), never from hardcoded config.
- Use `URLPattern` in the client too if route matching is needed, mirroring `shared/routes.js`.

**Rule:** No enhancement may introduce a code path that the no-JS baseline doesn't already satisfy. Enhancement changes *how fast/smooth*, never *whether it works*.

If a batteries-included hypermedia library is ever desired, **htmx** is the only acceptable candidate (it is HATEOAS-native and standards-friendly). Default to hand-rolled enhancement first; introduce htmx only with explicit human sign-off.

---

## 8. Static generation (build)

`build/build.js`:
- Imports templates from `shared/templates/` and data from `shared/data/`.
- Renders every statically-knowable route to `dist/client/<path>/index.html`.
- Copies/bundles `client/styles/` and `client/enhance/` into `dist/client/`.
- Must be runnable as `npm run build` and produce a deterministic `dist/client/`.
- Keep it dependency-light. Node's built-in `fs`/`path` are sufficient. A minimal bundler (esbuild) is acceptable **only** for the client enhancement JS if module bundling is needed; do not pull in a meta-framework.

---

## 9. Worker and routing

`worker/index.js` is the Worker entry. Use **`URLPattern`** for routing (web standard, no router dependency). Route table lives in `shared/routes.js` so build and worker agree on URLs.

```js
// worker/index.js
import { render } from "../shared/html.js";
import { routes } from "../shared/routes.js";

export default {
  /**
   * @param {Request} request
   * @param {{ ASSETS: Fetcher, HYPERDRIVE: { connectionString: string } }} env
   */
  async fetch(request, env) {
    const url = new URL(request.url);

    for (const route of routes) {
      if (route.method === request.method && route.pattern.test(url)) {
        const match = route.pattern.exec(url);
        return route.handle({ request, env, params: match?.pathname.groups ?? {} });
      }
    }

    // Fall through to static assets for everything else.
    return env.ASSETS.fetch(request);
  },
};
```

- Dynamic handlers render via shared templates and honor the fragment/full-page negotiation from §6.
- Static assets are served via the `ASSETS` binding. Static-first vs worker-first ordering is configured in `wrangler.jsonc` (§10) — verify current asset-routing flags against live docs before relying on exact field names.
- Workers run on V8 isolates: effectively no cold start, scale-to-zero. Write handlers as pure request→response; keep no mutable module-global state.

---

## 10. Cloudflare configuration (`wrangler.jsonc`)

Baseline shape (verify field names/semantics against current docs — the platform moves fast; see §15):

```jsonc
{
  "name": "site",
  "main": "./dist/server/index.js",
  "compatibility_date": "2026-05-01",
  "preview_urls": true,                 // enables per-branch preview URLs
  "assets": {
    "directory": "./dist/client/",
    "binding": "ASSETS"
  },
  "observability": { "enabled": true },

  // Primary data layer: Neon Postgres via Hyperdrive (see §12).
  "hyperdrive": [
    { "binding": "HYPERDRIVE", "id": "<production-hyperdrive-id>" }
  ]

  // If using D1 instead (alternative, see §12), replace hyperdrive with:
  // "d1_databases": [
  //   { "binding": "DB", "database_name": "site", "database_id": "<prod-id>" }
  // ]
}
```

Per-environment overrides (e.g. `env.preview`) point bindings at preview resources; the deploy script (§13) injects the per-branch IDs.

---

## 11. Per-branch code deployments

Use Cloudflare **Workers Builds** (native git integration) — this is the Netlify/Vercel-style "push a branch, get a preview" workflow, no hand-rolled CI required.

- Connect the GitHub repo to the Worker via Workers Builds.
- Production branch (`main`) → production deploy.
- Every other branch / PR → preview version with a **stable branch preview URL** of the form `<branch-name>-<worker-name>.<subdomain>.workers.dev`, posted as a PR comment. The URL stays stable as commits are added.
- A specific version also gets a unique **commit preview URL**.
- Custom aliases: `wrangler versions upload --preview-alias <name>`.

Do **not** hand-roll GitHub Actions for this unless Workers Builds proves insufficient; native integration is the default.

---

## 12. Data layer

**Primary: Neon Postgres + Cloudflare Hyperdrive.** Chosen because the per-branch-database requirement needs real branching, and Neon provides instant copy-on-write branches purpose-built for preview environments. Compute stays on Cloudflare; only the database is Neon. Connect from the Worker through Hyperdrive (connection pooling + edge caching of the Postgres wire protocol). Query with a thin Postgres client; keep all queries in `shared/data/`.

**Alternative: Cloudflare D1 (SQLite), 100% on Cloudflare.** Acceptable if staying entirely on Cloudflare matters more than native branching. Caveat the agent must respect: **D1 has no native git-branch database branching today** (it is on Cloudflare's roadmap via Time Travel). On D1, preview environments share the production database unless you explicitly isolate them, so branch isolation must be **scripted** — create a uniquely-named D1 database per branch, apply migrations, and bind it to the preview version. This is more fragile than Neon branching; only choose D1 with that understood.

Pick one and keep `shared/data/` behind a small interface so the rest of the code doesn't care which backend is live.

---

## 13. Per-branch database branches

The goal: each preview deployment talks to its own isolated database branch; production talks to the production database. `scripts/deploy.js` orchestrates this and is invoked by Workers Builds for every build.

**Neon path (primary):**
1. Determine the current git branch.
2. If `main`: target Neon's production branch and the production Hyperdrive config; deploy to production.
3. Else: create-or-reuse a Neon branch named after the git branch (e.g. `preview/<branch>`). Neon branches are near-instant and copy-on-write.
4. Create-or-update a Hyperdrive config pointing at that Neon branch's connection string.
5. Run migrations against the branch.
6. Deploy the Worker version with the branch's Hyperdrive binding injected.
7. On branch deletion / PR close, delete the Neon branch and its Hyperdrive config (cleanup job).

**D1 path (alternative):**
1. On non-`main` branches, `wrangler d1 create site-preview-<branch>` (idempotent: reuse if exists).
2. `wrangler d1 migrations apply --remote` against that database.
3. Bind it via a per-environment block / dynamic config for the preview version.
4. Clean up the per-branch database on PR close.

Secrets (DB credentials, Neon API key, Cloudflare API token) come from Workers Builds env vars / secrets — never commit them.

---

## 14. Migrations

- Plain SQL migration files in `db/migrations/`, applied in order. No ORM-driven migrations.
- A migration must apply cleanly to a freshly-branched database (previews depend on this).
- Forward-only by default; if a migration is risky, gate it behind a manual step and note it in the PR.
- Schema lives in `db/schema.sql` as the canonical reference; migrations are the mechanism.

---

## 15. Verify against live platform docs

Cloudflare ships changes constantly; do not trust memorized field names or limits. Before relying on any wrangler key, binding behavior, or quota:

- Fetch the docs index: `https://developers.cloudflare.com/llms.txt` (and product-specific `llms.txt`, e.g. D1's).
- Request the **Markdown** version of any doc page (append `index.md` to the URL or send `Accept: text/markdown`) — it's the agent-friendly form.
- Confirm: static-assets routing flags (worker-first vs asset-first, SPA/404 handling), `preview_urls` behavior, Hyperdrive setup, D1 environment bindings, and current free-tier limits.

If a documented behavior contradicts this file, the docs win — flag the discrepancy in your PR so this file gets updated.

---

## 16. Coding standards

- **Language:** JavaScript (`.js`/`.mjs`), ES modules. JSDoc for all exported functions and non-trivial locals. `tsconfig.json` runs `tsc --noEmit` with `"checkJs": true`, `"strict": true`. Type errors fail CI.
- **No client framework, no client router, no virtual DOM, no CSS-in-JS.**
- **CSS:** Author with native nesting, `@layer` for cascade control, custom properties for theming. One stylesheet pipeline; no preprocessor unless justified.
- **Accessibility:** Semantic HTML, real headings/landmarks, labelled controls, visible focus states, keyboard operability. The no-JS baseline must be fully accessible.
- **Security:** All dynamic HTML goes through the `html` helper (auto-escaping). Set `Content-Security-Policy` and standard security headers from the Worker. Never interpolate user input into SQL — parameterize every query.
- **Performance:** Static-first. Ship minimal JS. Lazy/defer enhancement modules. Let View Transitions + Speculation Rules do the perceived-speed work instead of a client framework.
- **Dependencies:** Each new runtime dependency requires justification in the PR description. Default answer is "use the platform."

---

## 17. Local development

- `npm run dev` runs the Worker locally via Wrangler (`wrangler dev`) with local static assets and a local database (local D1, or a Neon dev branch).
- `npm run build` produces `dist/`.
- `npm run check` runs `tsc --noEmit`.
- `npm run test` runs the test suite.
- Local DB state must be resettable to a clean migrated state with a single command.

---

## 18. Testing

- **Unit:** template functions (assert rendered HTML / escaping), the `html` helper, route matching, data functions against a test database.
- **Integration:** Worker request→response per route, asserting status codes, redirects, and that responses carry the correct HATEOAS controls for the actor's permissions.
- **No-JS path is a test target**, not an afterthought: assert that core flows complete via plain form POSTs and `303` redirects.
- Prefer the platform test runner / `vitest` with the Workers pool. Keep tests dependency-light.

---

## 19. Definition of done (per PR)

- [ ] Works with JavaScript disabled (core flows complete).
- [ ] Enhancement layer degrades gracefully (feature-detected, falls back).
- [ ] Dynamic responses share templates with the static build (no duplicated markup).
- [ ] Responses carry correct HATEOAS controls and HTTP semantics.
- [ ] `tsc` clean; tests pass.
- [ ] Preview deployment is reachable at its branch URL and uses its **own** database branch (verified: no production data touched).
- [ ] All HTML output is escaped; queries parameterized; security headers set.
- [ ] Any doc-contradiction or assumption flagged in the PR description.