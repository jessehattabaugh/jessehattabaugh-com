import { render } from '../../shared/html.js';
import { webCounter } from '../../shared/templates/web-counter.js';
import { paths } from '../../shared/routes.js';
import { error } from '../../shared/templates/error.js';
import { sessionUser } from '../auth/service.js';
import { redirect } from '../http/responses.js';
import { analyticsFragment, analyticsPage } from '../templates/analytics.js';
import { analyticsConfigured, readAnalytics, viewCount } from './data.js';

const windowDays = 30;

/**
 * Cache each page separately. A short failure cache limits repeat requests
 * during provider outages, and never substitutes zero for an unavailable count.
 * @param {URL} origin @param {string} pathname
 * @param {import('../types.js').Env} env @param {ExecutionContext} ctx
 */
async function publicCount(origin, pathname, env, ctx) {
	const siteTag = encodeURIComponent(env.WEB_COUNTER_SITE_TAG ?? '');
	const key = new Request(new URL(`/_cache/web-analytics/${siteTag}/${windowDays}/${encodeURIComponent(pathname)}`, origin));
	try {
		const cached = await caches.default.match(key);
		if (cached) { return /** @type {number | null} */ (await cached.json()); }
	} catch (error) { console.error('Web Analytics cache read failed', error); }

	let views = null;
	try { views = viewCount(await readAnalytics(env, windowDays, false, pathname)); }
	catch (error) { console.error('Public Web Analytics unavailable', error); }

	ctx.waitUntil(caches.default.put(key, Response.json(views, {
		headers: { 'Cache-Control': `public, max-age=${views === null ? 30 : 300}` },
	})).catch((error) => { console.error('Web Analytics cache write failed', error); }));
	return views;
}

/**
 * Stream the public count into the shared footer. Cloudflare manages the beacon.
 * @param {Request} request @param {Response} response
 * @param {import('../types.js').Env} env @param {ExecutionContext} ctx
 */
export function addAnalytics(request, response, env, ctx) {
	if (!analyticsConfigured(env) || request.method !== 'GET' || request.headers.get('X-Fragment') === 'true'
		|| response.status !== 200 || !response.headers.get('Content-Type')?.startsWith('text/html') || !response.body) { return response; }

	const url = new URL(request.url);
	const origin = env.SITE_ORIGIN ? new URL(env.SITE_ORIGIN) : null;
	if (!origin || (url.origin !== origin.origin && url.origin !== `${origin.protocol}//www.${origin.host}`)) { return response; }

	const transformed = new HTMLRewriter().on('body > footer > web-counter', {
		async element(element) {
			const count = await publicCount(origin, url.pathname, env, ctx);
			if (count !== null) { element.replace(render(webCounter(count, element.getAttribute('leading-zeros'))), { html: true }); }
		},
	}).transform(response);
	// Validators for the source asset do not describe the decorated document.
	transformed.headers.delete('ETag');
	transformed.headers.delete('Last-Modified');
	return transformed;
}

/** @param {Request} request @param {import('../types.js').Env} env */
export async function handleAnalytics(request, env) {
	const headers = { 'Content-Type': 'text/html;charset=utf-8', 'X-Robots-Tag': 'noindex', Vary: 'X-Fragment' };
	const template = request.headers.get('X-Fragment') === 'true' ? analyticsFragment : analyticsPage;
	const user = await sessionUser(request, env);
	if (!user) { return redirect(`${paths.login}?returnTo=${encodeURIComponent(paths.analytics)}`, headers, 302); }
	if (!user.is_owner) {
		return new Response(render(error({ message: 'Only the site owner can view visitor analytics.' })), { status: 403, headers });
	}
	const days = new URL(request.url).searchParams.get('days') === '7' ? 7 : windowDays;
	if (!analyticsConfigured(env)) {
		return new Response(render(template({ days, notice: 'Cloudflare Web Analytics is unavailable in this environment.' })), { headers });
	}
	try {
		const report = await readAnalytics(env, days, true);
		return new Response(render(template({ days, report, views: viewCount(report) })), { headers });
	} catch (error) {
		console.error('Owner Web Analytics unavailable', error);
		return new Response(render(template({ days, notice: 'Cloudflare Web Analytics could not be loaded. Try again shortly.' })), { status: 503, headers });
	}
}
