import * as notFound from '../pages/404.js';
import * as about from '../pages/about.js';
import * as hello from '../pages/hello/index.js';
import * as home from '../pages/index.js';
import * as resume from '../pages/resume.js';

const FILE_EMOJI = '🌐';

/** @type {Record<string, Object>} */
const routes = { '/': home, '/about': about, '/resume': resume, '/hello': hello, '/404': notFound };

/**
 * Converts a page handler result into a Netlify Function response.
 * Handles redirects, full response objects, plain HTML strings,
 * and fallback content. Sanitizes response headers to prevent
 * header injection.
 *
 * @param {*} result - Return value from a page handler
 * @param {string} pageRoute - Matched route path
 * @returns {{statusCode:number, headers:Record<string, string>, body:string}}
 */
export function buildResponse(result, pageRoute) {
	const defaultStatus = pageRoute == '/404' ? 404 : 200;
	const baseHeaders = { 'Content-Type': 'text/html' };

	if (result && typeof result == 'object' && result.redirect) {
		return {
			statusCode: result.statusCode || 302,
			headers: { Location: result.redirect },
			body: '',
		};
	}

	if (result && typeof result == 'object' && result.statusCode) {
		const responseBody = result.body == undefined ? (result.html ?? '') : result.body;
		const responseHeaders = { ...baseHeaders };

		if (result.headers) {
			for (const [key, value] of Object.entries(result.headers)) {
				responseHeaders[key] = String(value)
					.replaceAll('\r', '')
					.replaceAll('\n', '')
					.replaceAll('\t', ' ')
					.trim();
			}
		}

		return {
			statusCode: result.statusCode,
			headers: responseHeaders,
			body: String(responseBody),
		};
	}

	if (typeof result == 'string') {
		return { statusCode: defaultStatus, headers: baseHeaders, body: result };
	}

	const fallback = pageRoute == '/404' ? '<p>Page not found</p>' : '<p>No content available</p>';

	return { statusCode: defaultStatus, headers: baseHeaders, body: fallback };
}

/**
 * Netlify Functions catch-all entry point.
 * Dispatches requests to page modules and adapts from Netlify event/context
 * to the Lambda-like event object expected by page handlers.
 *
 * @param {Object} event
 * @returns {Promise<{statusCode:number, headers:Record<string, string>, body:string}>}
 */
export async function handler(event) {
	const rawUrl =
		event.rawUrl || `https://${event.headers?.host || 'localhost'}${event.path || '/'}`;
	const url = new URL(rawUrl);

	const pathname =
		url.pathname != '/' && url.pathname.endsWith('/')
			? url.pathname.slice(0, -1)
			: url.pathname;

	const pageModule = routes[pathname] || notFound;
	const pageRoute = routes[pathname] ? pathname : '/404';

	const method = (event.httpMethod || 'GET').toLowerCase();
	const handlerKey = method == 'delete' ? 'del' : method;
	const handlerFunction = pageModule[handlerKey];

	if (!handlerFunction) {
		const allowedMethods = ['get', 'post', 'put', 'del']
			.filter((m) => pageModule[m])
			.map((m) => (m == 'del' ? 'DELETE' : m.toUpperCase()));

		return {
			statusCode: 405,
			headers: { 'Content-Type': 'application/json', Allow: allowedMethods.join(', ') },
			body: JSON.stringify({
				error: 'Method Not Allowed',
				message: `HTTP method ${method.toUpperCase()} is not supported for this endpoint`,
			}),
		};
	}

	let body;
	if (method == 'get' || method == 'head') {
		body = undefined;
	} else {
		body = event.body == undefined ? '' : event.body;
		if (event.isBase64Encoded) {
			body = Buffer.from(body, 'base64').toString('utf8');
		}
	}

	/** @type {Record<string, string>} */
	const headers = {};
	for (const [key, value] of Object.entries(event.headers || {})) {
		headers[key.toLowerCase()] = String(value);
	}

	const pageEvent = {
		httpMethod: event.httpMethod,
		headers,
		body,
		path: pathname,
		queryStringParameters: event.queryStringParameters || Object.fromEntries(url.searchParams),
	};

	try {
		const result = await handlerFunction(pageEvent);
		return buildResponse(result, pageRoute);
	} catch (error) {
		console.error(`${FILE_EMOJI}💥 Page handler error for ${pathname}:`, error);
		return {
			statusCode: 500,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				error: 'Internal Server Error',
				message: 'An error occurred while processing your request',
			}),
		};
	}
}
