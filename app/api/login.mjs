/** @type {import('@enhance/types').EnhanceApiFn} */
export async function post(request) {
	const { AUTH_SECRET } = process.env;
	const { body } = request;
	const { secret } = body;
	if (secret) {
		console.debug('👍 secret provided', secret);
		const isAuthorized = secret === AUTH_SECRET;
		if (isAuthorized) {
			console.debug('👮 successfully authorized');
			return {
				location: '/auth',
				session: { isAuthorized },
			};
		} else {
			console.debug('👎 mismatched secrets', AUTH_SECRET);
			return {
				location: '/auth',
				session: { error: '👮‍♀️Wrong secret' },
				status: 400,
			};
		}
	} else {
		console.debug('🙈 no secret provided');
		return {
			location: '/auth',
			session: { error: '🕵️ please provide a secret' },
			status: 400,
		};
	}
}
