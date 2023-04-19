/**
 * @type {import('@enhance/types').EnhanceApiFn} */
export async function get(request) {
	const { session } = request;
	const { error, isAuthorized } = session;
	return {
		json: { error, isAuthorized },
	};
}
