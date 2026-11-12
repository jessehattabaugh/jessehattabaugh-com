const dataset = 'rumPageloadEventsAdaptiveGroups';
const query = (/** @type {boolean} */ details) => { return `query WebAnalytics($account: string!, $filter: AccountRumPageloadEventsAdaptiveGroupsFilter_InputObject!) {
	viewer {
		accounts(filter: {accountTag: $account}) {
			total: ${dataset}(filter: $filter, limit: 1) { count }
			${details ? `days: ${dataset}(filter: $filter, limit: 31, orderBy: [date_DESC]) {
				count
				dimensions { label: date }
			}
			pages: ${dataset}(filter: $filter, limit: 20, orderBy: [count_DESC]) {
				count
				dimensions { label: requestPath }
			}
			countries: ${dataset}(filter: $filter, limit: 20, orderBy: [count_DESC]) {
				count
				dimensions { label: countryName }
			}` : ''}
		}
	}
}`; };

/** @typedef {{count: number, dimensions: {label: string}}} Group */
/** @typedef {{total: {count: number}[], days?: Group[], pages?: Group[], countries?: Group[]}} Analytics */

/** @param {import('../types.js').Env} env */
export function analyticsConfigured(env) {
	return !env.PREVIEW_BRANCH && Boolean(env.WEB_COUNTER_ACCOUNT_ID && env.WEB_COUNTER_SITE_TAG && env.WEB_COUNTER_API_TOKEN);
}

/** @param {import('../types.js').Env} env @param {number} days @param {boolean} details @param {string} [pathname] */
export async function readAnalytics(env, days, details, pathname) {
	const end = Date.now();
	const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
		method: 'POST',
		headers: { Authorization: `Bearer ${env.WEB_COUNTER_API_TOKEN}`, 'Content-Type': 'application/json' },
		signal: AbortSignal.timeout(details ? 8000 : 2500),
		body: JSON.stringify({ query: query(details), variables: {
			account: env.WEB_COUNTER_ACCOUNT_ID,
			filter: {
				siteTag: env.WEB_COUNTER_SITE_TAG,
				requestPath: pathname,
				'datetime_geq': new Date(end - days * 86_400_000).toISOString(),
				'datetime_leq': new Date(end).toISOString(),
			},
		} }),
	});
	if (!response.ok) { throw new Error(`Cloudflare analytics HTTP ${response.status}`); }
	const payload = /** @type {{data?: {viewer?: {accounts?: Analytics[]}}, errors?: unknown[]}} */ (await response.json());
	const report = payload.data?.viewer?.accounts?.[0];
	if (payload.errors?.length || !report?.total || (details && (!report.days || !report.pages || !report.countries))) {
		throw new Error('Cloudflare analytics query did not return the requested data');
	}
	return report;
}

/** @param {Analytics} report */
export function viewCount(report) {
	const count = report.total[0]?.count ?? 0;
	if (!Number.isSafeInteger(count) || count < 0) { throw new Error('Invalid Cloudflare page view count'); }
	return count;
}
