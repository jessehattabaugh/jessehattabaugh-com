import { render } from '../shared/html.js';
import { contact } from '../shared/templates/contact.js';
import { error as errorPage } from '../shared/templates/error.js';
import { insertContactMessage } from '../shared/data/contact.js';
import { handleMessagesApi } from './messages-api.js';

const SECURITY_HEADERS = {
	'Content-Security-Policy':
		"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; form-action 'self'",
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'X-Content-Type-Options': 'nosniff',
	'X-Frame-Options': 'DENY',
};

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

/**
 * @param {Request} request
 * @param {import('../shared/types.js').Env} env
 * @returns {Promise<Response>}
 */
async function handleContactPost(request, env) {
	const contentType = request.headers.get('content-type') ?? '';
	if (
		!contentType.includes('application/x-www-form-urlencoded') &&
		!contentType.includes('multipart/form-data')
	) {
		return new Response('Unsupported Media Type', { status: 415, headers: SECURITY_HEADERS });
	}

	const form = await request.formData();
	const name = (form.get('name') ?? '').toString().trim();
	const email = (form.get('email') ?? '').toString().trim();
	const message = (form.get('message') ?? '').toString().trim();

	if (!name || !email || !message) {
		return htmlResponse(
			render(
				contact({ error: 'All fields are required.', values: { name, email, message } }),
			),
			422,
		);
	}

	if (!email.includes('@')) {
		return htmlResponse(
			render(
				contact({
					error: 'Please enter a valid email address.',
					values: { name, email, message },
				}),
			),
			422,
		);
	}

	await insertContactMessage(env.DB, { name, email, message });

	return new Response(null, {
		status: 303,
		headers: { Location: new URL('/thanks', request.url).toString(), ...SECURITY_HEADERS },
	});
}

/** @type {ExportedHandler<import('../shared/types.js').Env>} */
export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		try {
			// /contact → redirect to messaging app
			if (request.method === 'GET' && url.pathname === '/contact') {
				return Response.redirect(new URL('/apps/messages/', request.url).toString(), 301);
			}

			// Legacy contact form POST (keep functional for no-JS fallback)
			if (request.method === 'POST' && url.pathname === '/contact') {
				return handleContactPost(request, env);
			}

			// Messages app API and share-target routes
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
