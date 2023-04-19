/** @type {import('@enhance/types').EnhanceApiFn} */
export async function post({ body }) {
	const { AUTH_SECRET } = process.env;
	const { secret } = body;
	const isAuthorized = secret === AUTH_SECRET;
	return {
		location: '/auth',
		session: { isAuthorized },
	};
}
