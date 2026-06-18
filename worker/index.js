import { render } from '../shared/html.js';
import { error as errorPage } from '../shared/templates/error.js';
import { handleMessagesApi } from './messages-api.js';
import { SECURITY_HEADERS } from './security-headers.js';

/**
 * @param {string} html
 * @param {number} [status]
 * @returns {Response}
 */
function htmlResponse(html, status = 200) {
	return new Response(html, {
		status,
		headers: { 'Content-Type': 'text/html;charset=utf-8', ...SECURITY_HEADERS },
	});
}

/** @type {ExportedHandler<import('../shared/types.js').Env>} */
export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		try {
			// /contact → redirect to messaging app (old bookmarks/links)
			if (request.method === 'GET' && url.pathname === '/contact') {
				return Response.redirect(new URL('/apps/messages/', request.url).toString(), 301);
			}

			// Messages app: SSR shell, API, and share-target routes
			if (url.pathname.startsWith('/apps/messages/')) {
				try {
					const apiResponse = await handleMessagesApi(request, env);
					if (apiResponse !== null) {
						return apiResponse;
					}
				} catch (e) {
					console.error(e);
					if (url.pathname.startsWith('/apps/messages/api/')) {
						return new Response(JSON.stringify({ error: 'Internal server error' }), {
							status: 500,
							headers: { 'Content-Type': 'application/json' },
						});
					}
					throw e;
				}
			}

			// Fall through to static assets
			const assetResponse = await env.ASSETS.fetch(request);

			// Serve 404 page with correct status when asset not found
			if (assetResponse.status === 404) {
				const notFoundPage = await env.ASSETS.fetch(new URL('/404/', request.url));
				const headers = new Headers(notFoundPage.headers);
				for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
					headers.set(key, value);
				}
				return new Response(notFoundPage.body, { status: 404, headers });
			}

			return assetResponse;
		} catch (e) {
			console.error(e);
			return htmlResponse(render(errorPage()), 500);
		}
	},
};
