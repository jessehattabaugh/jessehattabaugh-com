
/**
 * @type {import('@enhance/types').EnhanceApiFn} */
export async function get(request) {
	const { session } = request;
	const { isAuthorized } = session;
	return {
		json: { isAuthorized },
	};
}

/** @type {import('@enhance/types').EnhanceApiFn} */
export async function post({ body }) {
	const { AUTH_SECRET } = process.env;
	const { secret } = body;
	if (secret) {
		const isAuthorized = secret === AUTH_SECRET;
		if (isAuthorized) {
			return {
				location: '/auth/in',
				session: { isAuthorized },
			};
		} else {
			return {
				location: '/auth/in',
				session: { error: '' },
			};
		}
	} else {
		return {
			location: '/auth/in',
			session: { error: 'Must submit a secret' },
		};
	}

}
