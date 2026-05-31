import { render } from '../shared/html.js';
import { contact } from '../shared/templates/contact.js';
import { notFound } from '../shared/templates/not-found.js';
import { error as errorPage } from '../shared/templates/error.js';
import { insertContactMessage } from '../shared/data/contact.js';

const SECURITY_HEADERS = {
	'Content-Security-Policy':
		"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; form-action 'self'",
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
 * Detect whether this is a fragment request (JS progressive enhancement).
 * @param {Request} request
 * @returns {boolean}
 */
function isFragment(request) {
	return (
		request.headers.get('Accept') === 'text/fragment+html' ||
		request.headers.get('X-Fragment') === 'true'
	);
}

/** @type {ExportedHandler<import('../shared/types.js').Env>} */
export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		try {
			// GET /contact
			if (request.method === 'GET' && url.pathname === '/contact') {
				return htmlResponse(render(contact()));
			}

			// POST /contact
			if (request.method === 'POST' && url.pathname === '/contact') {
				return handleContactPost(request, env);
			}

			// Fall through to static assets
			return env.ASSETS.fetch(request);
		} catch (err) {
			console.error(err);
			return htmlResponse(render(errorPage()), 500);
		}
	},
};

/**
 * @param {Request} request
 * @param {import('../shared/types.js').Env} env
 * @returns {Promise<Response>}
 */
async function handleContactPost(request, env) {
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

	// Basic email format check
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

	// PRG: redirect after POST so browser back button doesn't re-submit
	return Response.redirect(new URL('/thanks', request.url).toString(), 303);
}
