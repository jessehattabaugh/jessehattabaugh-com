import { handleCrunchTime } from './apps/crunch-time/worker.js';
import { render } from '../shared/html.js';
import { error as errorPage } from '../shared/templates/error.js';
import { dynamicRoutes, paths } from '../shared/routes.js';
import { Hono } from 'hono';
import { handleAuthApi } from './auth/worker.js';
import { handleMessagesApi } from './apps/messages/worker.js';
import { handleRainbowApi } from './apps/rainbow-hour/worker.js';
import { handleLightsfinder } from './apps/lightsfinder/worker.js';
import { rainbowWakeCron } from './apps/rainbow-hour/cron.js';
import { SECURITY_HEADERS } from './http/security-headers.js';
import { RequestBodyError, ServiceError } from './http/request.js';
import { handleAtproto } from './pages/worker.js';
import { addAnalytics, handleAnalytics } from './analytics/worker.js';

/** Apply security headers to every representation, including assets and redirects. */
/** @param {Response} response @param {boolean} [head] @param {boolean} [actorDemo] */
function secure(response, head = false, actorDemo = false) {
	const headers = new Headers(response.headers);
	for (const [name, value] of Object.entries(SECURITY_HEADERS)) { headers.set(name, value); }
	// Only the handle demo needs to read public records from Bluesky-hosted PDSs.
	if (actorDemo) {
		headers.set('Content-Security-Policy', SECURITY_HEADERS['Content-Security-Policy']
			.replace('https://tile.openstreetmap.org;', 'https://tile.openstreetmap.org https://*.host.bsky.network;')
			.replace('https://api.open-meteo.com;', 'https://api.open-meteo.com https://public.api.bsky.app https://plc.directory https://*.host.bsky.network;'));
	}
	return new Response(head ? null : response.body, { status: response.status, headers });
}

/** @param {number} status @param {Record<string, string>} [headers] */
function failure(status, headers = {}) {
	return new Response(render(errorPage()), { status, headers: { 'Content-Type': 'text/html;charset=utf-8', ...headers } });
}

/** Bind each feature once. New URLs for that feature belong only in the catalog.
 * @type {Record<string, (request: Request, env: import('./types.js').Env, ctx: ExecutionContext) => Promise<Response | null>>} */
const handlers = {
	social: handleAtproto, lightsfinder: handleLightsfinder, crunch: handleCrunchTime,
	analytics: handleAnalytics, auth: handleAuthApi, messages: handleMessagesApi,
	rainbow: handleRainbowApi,
};

/** @param {Request} request @param {import('./types.js').Env} env */
async function assets(request, env) {
	const response = await env.ASSETS.fetch(request);
	if (response.status !== 404) { return response; }
	const fallback = await env.ASSETS.fetch(new URL('/404.html', request.url));
	return new Response(fallback.body, { status: 404, headers: fallback.headers });
}

/** @type {Hono<{ Bindings: import('./types.js').Env; Variables: { execution: ExecutionContext } }>} */
const router = new Hono();
router.use('*', async (context, next) => {
	context.set('execution', /** @type {ExecutionContext} */ (context.executionCtx));
	await next();
});
// Keep the existing standard error page even for exceptions caught inside Hono.
router.onError((error, context) => {
	console.error(error);
	/** @type {Record<string, string>} */
	const diagnostics = context.env.PREVIEW_BRANCH && error instanceof ServiceError ? { 'X-Preview-Service-Error': error.code } : {};
	return failure(error instanceof RequestBodyError ? error.status : 500, diagnostics);
});

for (const route of dynamicRoutes) {
	const methods = route.methods ?? ['GET'];
	const handle = route.handler ? handlers[route.handler] : undefined;
	if (route.handler && !handle) { throw new Error(`Missing handler: ${route.handler}`); }
	router.all(route.path, async (context) => {
		const request = context.req.raw;
		const url = new URL(request.url);
		const { method } = request;
		if (!methods.includes(method)) {
			const allowed = methods.includes('GET') ? [...methods, 'HEAD'] : methods;
			return failure(405, { Allow: allowed.join(', ') });
		}
		if (method !== 'GET') {
			const origin = request.headers.get('Origin');
			if ((origin && origin !== url.origin) || request.headers.get('Sec-Fetch-Site') === 'cross-site') { return failure(403); }
		}
		if (route.redirect) {
			const destination = paths[/** @type {keyof typeof paths} */ (route.redirect)];
			if (!destination) { throw new Error(`Unknown redirect: ${route.redirect}`); }
			return new Response(null, { status: 301, headers: { Location: destination } });
		}
		const response = await handle?.(request, context.env, context.get('execution'));
		if (!response) { return assets(request, context.env); }
		const headers = new Headers(response.headers);
		if (route.handler !== 'social') { headers.set('Cache-Control', 'no-store'); }
		return new Response(response.body, { status: response.status, headers });
	});
	if (route.path !== '/' && route.path.endsWith('/')) {
		router.all(route.path.slice(0, -1), (context) => {
			const url = new URL(context.req.url);
			url.pathname = route.path;
			return new Response(null, { status: 308, headers: { Location: url.href } });
		});
	}
}
router.notFound((context) => { return assets(context.req.raw, context.env); });

/** @type {ExportedHandler<import('./types.js').Env>} */
export default {
	async fetch(request, env, ctx) {
		const head = request.method === 'HEAD';
		try {
			// Hono executes GET routes for HEAD; normalize before dispatch so every
			// feature sees the same method, then remove the response body once.
			const routeRequest = head ? new Request(request, { method: 'GET' }) : request;
			const response = await router.fetch(routeRequest, env, ctx);
			const headers = new Headers(response.headers);
			if (env.PREVIEW_BRANCH && env.PREVIEW_DB_NAME) {
				headers.set('X-Preview-Branch', env.PREVIEW_BRANCH);
				headers.set('X-Preview-Database', env.PREVIEW_DB_NAME);
			}
			const document = new Response(response.body, { status: response.status, headers });
			return secure(addAnalytics(request, document, env, ctx), head, new URL(request.url).pathname === paths.rpgActor);
		} catch (error) {
			console.error(error);
			return secure(failure(500), head);
		}
	},
	async scheduled(controller, env, ctx) {
		ctx.waitUntil(rainbowWakeCron(env).catch((error) => { return console.error('Rainbow Hour wake cron failed', error); }));
	},
};
