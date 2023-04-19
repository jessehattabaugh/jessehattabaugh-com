
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
	const isAuthorized = secret === AUTH_SECRET;
	return {
		location: '/auth/in',
		session: { isAuthorized },
	};
}
