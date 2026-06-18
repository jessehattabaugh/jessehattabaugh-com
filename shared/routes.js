/**
 * Shared route definitions used by both the build step and the Worker.
 * The pattern base is intentionally left empty — callers supply the base URL.
 *
 * @typedef {{
 *   test: (input: string | URL) => boolean,
 *   exec: (input: string | URL) => { pathname: { groups: Record<string, string> } } | null,
 * }} RoutePattern
 */

class PathnamePattern {
	/** @param {{ pathname: string }} init */
	constructor(init) {
		this.pathname = init.pathname;
	}

	/** @param {string | URL} input */
	test(input) {
		const url = input instanceof URL ? input : new URL(String(input), 'https://local.invalid');
		return url.pathname === this.pathname;
	}

	/** @param {string | URL} input */
	exec(input) {
		if (!this.test(input)) {
			return null;
		}

		return { pathname: { groups: {} } };
	}
}

const GlobalScope =
	/** @type {{ URLPattern?: new (init: { pathname: string }) => RoutePattern }} */ (globalThis);
const URLPatternConstructor = GlobalScope.URLPattern ?? PathnamePattern;

export const staticRoutes = [
	{ method: 'GET', pattern: new URLPatternConstructor({ pathname: '/' }), static: true },
	{ method: 'GET', pattern: new URLPatternConstructor({ pathname: '/about' }), static: true },
	{ method: 'GET', pattern: new URLPatternConstructor({ pathname: '/colophon' }), static: true },
];

/**
 * Dynamic routes handled by the Worker (not pre-rendered).
 * @type {Array<{ method: string, pattern: RoutePattern }>}
 */
export const dynamicRoutes = [
	{ method: 'GET', pattern: new URLPatternConstructor({ pathname: '/contact' }) },
	{ method: 'GET', pattern: new URLPatternConstructor({ pathname: '/apps/messages/' }) },
	{ method: 'POST', pattern: new URLPatternConstructor({ pathname: '/apps/messages/' }) },
];
