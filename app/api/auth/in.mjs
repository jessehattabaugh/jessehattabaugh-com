
/**
 * @type {import('@enhance/types').EnhanceApiFn} */
export async function get(request) {
	const { session } = request;
	const { error, isAuthorized } = session;
	return {
		json: { error, isAuthorized },
	};
}

/** @type {import('@enhance/types').EnhanceApiFn} */
export async function post(request) {
	const { AUTH_SECRET } = process.env;
	const { body } = request;
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
				session: { error: '👮‍♀️Wrong secret' },
				status: 400,
			};
		}
	} else {
		return {
			location: '/auth/in',
			session: { error: '👽Must submit a secret' },
			status: 400,
		};
	}
}
