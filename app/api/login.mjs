/** authorizes the session if the user submitted a secret password that matches the AUTH_SECRET env var
 * @type {import('@enhance/types').EnhanceApiFn} */
export async function post(request) {
	const { AUTH_SECRET } = process.env;
	const { body } = request;
	const { secret } = body;
	if (secret) {
		// console.log('👍 secret provided', secret);
		const isAuthorized = secret === AUTH_SECRET;
		if (isAuthorized) {
			// console.log('👮 successfully authorized');
			return {
				location: '/auth',
				session: { isAuthorized },
			};
		}
		// console.log('🙅 mismatched secrets', AUTH_SECRET);
		return {
			location: '/auth',
			session: { error: '🙅 Wrong secret' },
		};
	}
	// console.log('🕵️ no secret provided');
	return {
		location: '/auth',
		session: { error: '🕵️ please provide a secret' },
	};
}
