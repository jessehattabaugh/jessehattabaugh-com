/** @param {unknown} data @param {number} [status] @param {Record<string, string>} [headers] */
export function json(data, status = 200, headers = {}) {
	return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

/** @param {string} href @param {Record<string, string>} [headers] @param {number} [status] */
export function redirect(href, headers = {}, status = 303) {
	return new Response(null, { status, headers: { Location: href, ...headers } });
}

