
/** move data from session to state.store
 * @type {import('@enhance/types').EnhanceApiFn} */
export async function get(request) {
	const { text = '', title = '', url = '' } = request.query;
	const { error, isAuthorized } = request.session;
	return { json: { error, isAuthorized, text, title, url } };
}

