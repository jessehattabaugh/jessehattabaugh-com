# Engineering review — 2026-10-26

## Hiring assessment

This repository gives me credible reasons to interview its author for a
product-focused full-stack role. It demonstrates ownership across UI, persistence,
authentication, deployment, accessibility, and failure handling. The strongest
signal is deliberate use of the web platform with working fallback paths.
A repository alone cannot establish production scale, team leadership, or security
assurance; those need operational evidence and a technical discussion.

| Skill I would assess | Evidence worth opening | Assessment |
| --- | --- | --- |
| Web architecture | `worker/index.js`, `shared/routes.js`, `client/enhance/index.js` | Server-owned controls, HTTP methods, HTML negotiation and native fallbacks show understanding beyond framework conventions. |
| Security fundamentals | `shared/html.js`, `worker/auth/session.js`, `worker/http/`, app data modules | Escaping, HMAC verification, host-only cookies, origin checks and parameterized values are concrete strengths. Custom credential parsing still needs specialist scrutiny. |
| Data correctness | `shared/data/email-verification.js`, `apps/crunch-time/data.js` | Conditional writes, atomic verification and retry-safe workout IDs show thought about races and failure recovery. |
| Accessibility and resilience | `shared/templates/`, `tests/apps/`, `playwright.config.js` | Native forms and semantic browser selectors, exercised with JS on/off at two viewport sizes, make accessibility part of feature delivery. |
| Integration design | `site/data/atproto.js`, `site/worker.js`, `apps/lightsfinder/routing.js` | Bounded timeouts, independent source fallbacks, same-origin images and explicit unavailable states show practical integration work. |
| Delivery discipline | `scripts/preview.js`, `scripts/deploy.js`, `tests/helpers/database.js` | Shared branch identity and database checks guard test isolation. Real-service tests bring meaningful confidence but also environmental dependencies. |
| Maintainability | Feature modules, narrow data files, separate runtime type projects | Ownership is now visible in the tree; callers no longer obtain platform identity helpers from a messaging module. |
| Product judgment | Manual workouts, account recovery, offline explanations | Browser-only APIs are optional and limitations are acknowledged rather than hidden. |

## Changes made from this assessment

The previous tree mixed app code into `worker/` and `shared/`, while Lightsfinder
already used feature ownership. All four apps now follow that pattern. Public-site
pages and AT Protocol integration have a separate `site/` owner. Server
infrastructure is grouped into authentication, HTTP, crypto and push modules.
Browser assets retain their existing locations and URLs.

The 483-line mixed messaging data module was split by accounts, passkeys, email
verification and conversations/push subscriptions. Function bodies and SQL were
preserved. The cross-domain email transaction remains deliberately whole.
Test-only D1 maintenance moved out of production source. Browser suites now mirror
app, public-site and platform ownership.

The README is an entry point instead of a full product manual. Existing detailed
notes remain in `docs/reference.md`; architecture rules were reconciled in
`AGENTS.md`. Type-project globs follow the moved modules. Lint now has a canonical
zero-warning command and dependency-boundary rules. Its `globals` dependency is
explicit in the manifest and lockfile. Four existing lint warnings were resolved.
The build excludes browser TypeScript configuration from public assets.

## Remaining work, in priority order

1. **Credential boundary review.** `worker/auth/webauthn.js` and `cbor.js` implement
	protocol parsing directly, with `any` assertions around untrusted credentials.
	Review malformed payloads, algorithm/key constraints and replay/counter cases
	through deployed browser flows. A small audited dependency could be justified
	here; avoiding dependencies is not itself a security guarantee.
2. **Request limits and abuse controls.** `worker/http/request.js` parses entire
	form/JSON bodies before field-level validation. App-specific limits exist, but
	a consistent pre-parse size policy and authentication-request throttling deserve
	a focused change. This review does not claim an exploitable vulnerability.
3. **Stronger runtime typing.** Separate DOM and service-worker type environments
	to replace repeated `any` event/global casts. Tighten external JSON validation.
	The handwritten `shared/types.js` binding contract can drift from Wrangler;
	consider generated binding types with a documented regeneration command.
4. **Test reliability and realistic state.** `tests/site/atproto.test.js` assumes
	live profile/listing content. Add explicit empty/unavailable cases without
	turning real-server tests into mocks. Fixture owners can coexist, while
	`getOwner()` selects one owner without ordering; concurrent owner-dependent
	flows need careful isolation. Routine suites intentionally omit real email,
	physical sensors and OS notification behavior, so passing them is not proof of
	those capabilities.
5. **Operational evidence.** Logs are enabled, but traces are not explicitly
	configured. Add structured, privacy-conscious failure context and a practical
	incident/rollback exercise before presenting this as production operations
	expertise. Keep configuration changes separate from file moves. Cloudflare's
	[current guidance](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/)
	is the reference for observability and runtime behavior.
6. **Maintainable data and integration boundaries.** Email verification still
	coordinates message approval and notifications. Preserve its transactional
	guarantees when decoupling. Photos in D1 and public routing/weather services are
	documented small-scale choices, not demonstrated large-scale infrastructure.

The tests remain E2E-only as required by this project. That is a deliberate policy,
with the tradeoff that low-level protocol edge cases must be exercised through
browser-visible flows rather than a faster isolated test suite. No framework,
additional runtime dependency, schema migration or URL change was introduced.

## Validation

See the accompanying change summary for actual run results. Type checking, lint,
static generation and test discovery do not substitute for deployed browser runs.
The reorganization preserves existing capability exceptions and live-service
requirements rather than claiming that all browser/OS behavior is automated.
