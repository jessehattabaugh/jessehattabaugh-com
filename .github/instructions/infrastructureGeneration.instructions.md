---
applyTo: 'wrangler.toml'
---

# Cloudflare Pages / Wrangler Guidelines

-   **Use `wrangler.toml` for project config.** Declare `name`, `compatibility_date`, and `pages_build_output_dir` here; keep it minimal.
-   **No build step required.** Pages Functions are served directly from `functions/`; static assets from the project root. Only add a build command if a transpilation step is genuinely needed.
-   **Compatibility date pinning.** Set `compatibility_date` to a recent stable date; update intentionally when adopting new runtime APIs.
-   **Environment separation via branches.** Production deploys from `main`; staging/preview deploys from feature or staging branches — no separate config files needed.
-   **Secrets via dashboard.** Store secrets (API keys, tokens) in the Cloudflare Pages dashboard environment variables, never committed to the repo.
-   **Functions entry point.** `functions/[[path]].js` is the catch-all Pages Function; add additional files under `functions/` only if a specific path needs isolated logic.
-   **Static assets served first.** Cloudflare Pages serves files from the output directory before invoking Functions; keep static paths predictable (e.g., `/static/*`).
-   **No server-side state.** Pages Functions are stateless edge workers; use Cloudflare KV, D1, or R2 bindings if persistence is needed, declared in `wrangler.toml`.
-   **Test locally with `wrangler pages dev`.** Matches the production runtime; use `npm run dev` which wraps this command.
-   **Deploy with Wrangler CLI or Git push.** `npm run deploy` runs `wrangler pages deploy`; Git-integrated deploys are the preferred production path.
