/**
 * Shared route definitions used by both the build step and the Worker.
 * The pattern base is intentionally left empty — callers supply the base URL.
 *
 * @type {Array<{ method: string, pattern: URLPattern, static?: boolean }>}
 */
export const staticRoutes = [
	{ method: 'GET', pattern: new URLPattern({ pathname: '/' }), static: true },
	{ method: 'GET', pattern: new URLPattern({ pathname: '/about' }), static: true },
	{ method: 'GET', pattern: new URLPattern({ pathname: '/colophon' }), static: true },
	{ method: 'GET', pattern: new URLPattern({ pathname: '/thanks' }), static: true },
];

/**
 * Dynamic routes handled by the Worker (not pre-rendered).
 * @type {Array<{ method: string, pattern: URLPattern }>}
 */
export const dynamicRoutes = [
	{ method: 'GET', pattern: new URLPattern({ pathname: '/contact' }) },
	{ method: 'POST', pattern: new URLPattern({ pathname: '/contact' }) },
];
