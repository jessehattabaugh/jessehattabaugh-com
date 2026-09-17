/** Typed fetch wrappers for the Rainbow Hour API. */

const BASE = '/apps/rainbow-hour/api';

/** @param {string} path */
async function get(path) {
	const res = await fetch(`${BASE}${path}`, { credentials: 'include' });
	if (!res.ok) {
		const { error } = await res.json().catch(() => {
			return { error: res.statusText };
		});
		throw new Error(error ?? res.statusText);
	}
	return res.json();
}

/** @param {string} path @param {unknown} body */
async function post(path, body) {
	const res = await fetch(`${BASE}${path}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		const { error } = await res.json().catch(() => {
			return { error: res.statusText };
		});
		throw new Error(error ?? res.statusText);
	}
	return res.json();
}

/** @param {string} path @param {unknown} body */
async function del(path, body) {
	const res = await fetch(`${BASE}${path}`, {
		method: 'DELETE',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		const { error } = await res.json().catch(() => {
			return { error: res.statusText };
		});
		throw new Error(error ?? res.statusText);
	}
	return res.json();
}

export const api = {
	/** @returns {Promise<{ vapidPublicKey: string | null }>} */
	getConfig() {
		return get('/config');
	},

	/**
	 * @param {{ endpoint: string, keys: { p256dh: string, auth: string }, latitude: number, longitude: number, timezone: string }} sub
	 */
	subscribeAlerts(sub) {
		return post('/subscribe', sub);
	},

	/** @param {string} endpoint */
	unsubscribeAlerts(endpoint) {
		return del('/subscribe', { endpoint });
	},
};
