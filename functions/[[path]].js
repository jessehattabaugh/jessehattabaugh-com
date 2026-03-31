import * as notFound from '../pages/404.js';
import * as about from '../pages/about.js';
import * as hello from '../pages/hello/index.js';
import * as home from '../pages/index.js';
import * as resume from '../pages/resume.js';

const FILE_EMOJI = '🌐';

/** @type {Record<string, Object>} */
const routes = {
'/': home,
'/about': about,
'/resume': resume,
'/hello': hello,
'/404': notFound,
};

/**
 * Converts a page handler result into a Fetch API Response.
 * Handles redirect objects, full response objects, plain HTML strings,
 * and missing/unknown results. Sanitises response headers to prevent
 * header injection (OWASP A03).
 *
 * @param {*} result - Return value from a page handler
 * @param {string} pageRoute - Matched route path (used for default 404 status)
 * @returns {Response}
 */
export function buildResponse(result, pageRoute) {
const defaultStatus = pageRoute == '/404' ? 404 : 200;
const baseHeaders = { 'Content-Type': 'text/html' };

// Handler signalled a redirect
if (result && typeof result == 'object' && result.redirect) {
return Response.redirect(result.redirect, result.statusCode || 302);
}

// Handler returned a full response object with statusCode
if (result && typeof result == 'object' && result.statusCode) {
const responseBody = result.body == undefined ? (result.html ?? '') : result.body;
const responseHeaders = { ...baseHeaders };

if (result.headers) {
// Sanitise each value to prevent header injection
for (const [key, value] of Object.entries(result.headers)) {
responseHeaders[key] = String(value)
.replaceAll('\r', '')
.replaceAll('\n', '')
.replaceAll('\t', ' ')
.trim();
}
}

return new Response(responseBody, {
status: result.statusCode,
headers: responseHeaders,
});
}

// Handler returned a plain HTML string
if (typeof result == 'string') {
return new Response(result, { status: defaultStatus, headers: baseHeaders });
}

// No recognisable result — minimal fallback
const fallback =
pageRoute == '/404' ? '<p>Page not found</p>' : '<p>No content available</p>';
return new Response(fallback, { status: defaultStatus, headers: baseHeaders });
}

/**
 * Cloudflare Pages Functions catch-all entry point.
 * Dispatches requests to page modules, adapts between the Cloudflare Fetch API
 * and the Lambda-compatible event/response shape used by page handlers.
 *
 * @param {import('@cloudflare/workers-types').EventContext} context
 * @returns {Promise<Response>}
 */
export async function onRequest(context) {
const { request } = context;
const url = new URL(request.url);

// Normalise trailing slash (except root) for consistent route matching
const pathname =
url.pathname != '/' && url.pathname.endsWith('/')
? url.pathname.slice(0, -1)
: url.pathname;

const pageModule = routes[pathname] || notFound;
const pageRoute = routes[pathname] ? pathname : '/404';

const method = request.method.toLowerCase();
// Page modules export 'del' because 'delete' is a reserved word
const handlerKey = method == 'delete' ? 'del' : method;

/** @type {Function | undefined} */
const handlerFunction = pageModule[handlerKey];

if (!handlerFunction) {
const allowedMethods = ['get', 'post', 'put', 'del']
.filter((m) => pageModule[m])
.map((m) => (m == 'del' ? 'DELETE' : m.toUpperCase()));

return new Response(
JSON.stringify({
error: 'Method Not Allowed',
message: `HTTP method ${method.toUpperCase()} is not supported for this endpoint`,
}),
{
status: 405,
headers: {
'Content-Type': 'application/json',
Allow: allowedMethods.join(', '),
},
},
);
}

// Read request body for methods that can carry a payload
let body;
if (method == 'get' || method == 'head') {
body = undefined;
} else {
try {
body = await request.text();
} catch {
body = '';
}
}

// Normalise headers to a lowercase-keyed plain object for page handler compatibility
/** @type {Record<string, string>} */
const headers = {};
for (const [key, value] of request.headers.entries()) {
headers[key.toLowerCase()] = value;
}

/**
 * Lambda-compatible event object passed to page handlers.
 * @type {Object}
 */
const event = {
httpMethod: request.method,
headers,
body,
path: pathname,
queryStringParameters: Object.fromEntries(url.searchParams.entries()),
};

try {
const result = await handlerFunction(event);
return buildResponse(result, pageRoute);
} catch (error) {
console.error(`${FILE_EMOJI}❌ Page handler error for ${pathname}:`, error);
return new Response(
JSON.stringify({
error: 'Internal Server Error',
message: 'An error occurred while processing your request',
}),
{ status: 500, headers: { 'Content-Type': 'application/json' } },
);
}
}