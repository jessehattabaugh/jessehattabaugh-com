# Repository instructions

Read and follow [AGENTS.md](../AGENTS.md). It is authoritative for architecture,
style, progressive enhancement, security, deployment and testing.

Use JavaScript ES modules with JSDoc and tabs. Prefer native web APIs. Top-level
source directories identify execution domains: `build/` (Node), `server/`
(Cloudflare), `client/` (browser) and `test/` (deployed Playwright flows).
Root `shared/` is only for actual cross-runtime reuse. Within one runtime, put
cross-app/context helpers in that runtime's `shared/` directory. Keep app service
workers beside other app client code; check their WebWorker context separately.

See [docs/architecture.md](../docs/architecture.md) for exact ownership, source-to-URL
mapping and allowed dependencies, and [README.md](../README.md) to get started.
Keep public URLs and service-worker scopes stable when moving source files.
Document implementation in code and user-visible flows/errors in real browser
E2E tests. Use semantic/accessibility selectors. No unit tests, mocks or localhost
functional runs. Never deploy previews against production data.
