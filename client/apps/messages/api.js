/** Typed fetch wrappers for the Messages API. */

const BASE = '/apps/messages/api';

/** @param {string} path @param {unknown} [body] */
async function post(path, body) {
	const res = await fetch(`${BASE}${path}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: body !== undefined ? JSON.stringify(body) : undefined,
	});
	if (!res.ok) {
		const { error } = await res.json().catch(() => {
			return { error: res.statusText };
		});
		throw new Error(error ?? res.statusText);
	}
	return res.json();
}

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
	/** @returns {Promise<{ user: { id: string, displayName: string, isOwner: boolean } | null }>} */
	getMe() {
		return get('/auth/me');
	},

	/** @param {{ displayName: string, email: string }} body */
	registerBegin(body) {
		return post('/auth/register/begin', body);
	},
	/** @param {object} body */
	registerComplete(body) {
		return post('/auth/register/complete', body);
	},

	loginBegin() {
		return post('/auth/login/begin', {});
	},
	/** @param {object} body */
	loginComplete(body) {
		return post('/auth/login/complete', body);
	},

	logout() {
		return post('/auth/logout');
	},

	/** @param {string} [conversationId] */
	getMessages(conversationId) {
		return get(`/messages${conversationId ? `?conversationId=${conversationId}` : ''}`);
	},

	/** @param {{ content: string, conversationId?: string }} body */
	sendMessage(body) {
		return post('/messages', body);
	},

	/** @param {PushSubscription} sub */
	subscribePush(sub) {
		return post('/push/subscribe', sub.toJSON());
	},
	/** @param {string} endpoint */
	unsubscribePush(endpoint) {
		return del('/push/subscribe', { endpoint });
	},

	getConfig() {
		return get('/config');
	},
};
