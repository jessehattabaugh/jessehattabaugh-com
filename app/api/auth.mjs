/**
 * @type {import('@enhance/types').EnhanceApiFn} */
export function get(request) {
	const { session } = request;
	const { error, isAuthorized } = session;
	return {
		json: { error, isAuthorized },
	};
}
