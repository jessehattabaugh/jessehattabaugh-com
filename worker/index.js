import { render } from '../shared/html.js';
import { error as errorPage } from '../shared/templates/error.js';
import { findDynamicRoute, paths } from '../shared/routes.js';
import { handleMessagesApi } from './messages-api.js';
import { handleRainbowApi } from './rainbow-api.js';
import { rainbowWakeCron } from './rainbow-cron.js';
import { SECURITY_HEADERS } from './security-headers.js';
import { RequestBodyError } from './request.js';

/** Apply security headers to every representation, including assets and redirects. */
/** @param {Response} response @param {boolean} [head] */
function secure(response, head = false) {
	const headers = new Headers(response.headers);
	for (const [name, value] of Object.entries(SECURITY_HEADERS)) { headers.set(name, value); }
	return new Response(head ? null : response.body, { status: response.status, headers });
}

/** @param {number} status @param {Record<string, string>} [headers] */
function failure(status, headers = {}) {
	return new Response(render(errorPage()), { status, headers: { 'Content-Type': 'text/html;charset=utf-8', ...headers } });
}

/** @type {ExportedHandler<import('../shared/types.js').Env>} */
export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		const head = request.method === 'HEAD';
		try {
			let route = findDynamicRoute(url.pathname);
			// Canonicalize app roots before static assets can serve a raw 404.
			if (!route && !url.pathname.endsWith('/')) {
				const canonical = findDynamicRoute(`${url.pathname}/`);
				if (canonical) {
					url.pathname = canonical.path;
					return secure(new Response(null, { status: 308, headers: { Location: url.toString() } }), head);
				}
			}
			if (route) {
				const method = head ? 'GET' : request.method;
				if (!route.methods.includes(method)) { return secure(failure(405, { Allow: route.methods.join(', ') }), head); }
				if (method !== 'GET') {
					const origin = request.headers.get('Origin');
					if (origin && origin !== url.origin) { return secure(failure(403)); }
					if (request.headers.get('Sec-Fetch-Site') === 'cross-site') { return secure(failure(403)); }
				}
				if (head) { request = new Request(request, { method: 'GET' }); }
				let response;
				if (route.handler === 'contact') {
					response = new Response(null, { status: 301, headers: { Location: paths.messages } });
				} else {
					response = route.handler === 'messages' ? await handleMessagesApi(request, env) : await handleRainbowApi(request, env);
				}
				if (response) {
					const headers = new Headers(response.headers);
					headers.set('Cache-Control', 'no-store');
					if (env.PREVIEW_BRANCH && env.PREVIEW_DB_NAME) {
						headers.set('X-Preview-Branch', env.PREVIEW_BRANCH);
						headers.set('X-Preview-Database', env.PREVIEW_DB_NAME);
					}
					return secure(new Response(response.body, { status: response.status, headers }), head);
				}
			}
			const response = await env.ASSETS.fetch(request);
			if (response.status === 404) {
				const fallback = await env.ASSETS.fetch(new URL('/404.html', request.url));
				return secure(new Response(fallback.body, { status: 404, headers: fallback.headers }), head);
			}
			return secure(response, head);
		} catch (error) {
			console.error(error);
			return secure(failure(error instanceof RequestBodyError ? error.status : 500), head);
		}
	},
	async scheduled(controller, env, ctx) {
		ctx.waitUntil(rainbowWakeCron(env).catch((error) => console.error('Rainbow Hour wake cron failed', error)));
	},
};
