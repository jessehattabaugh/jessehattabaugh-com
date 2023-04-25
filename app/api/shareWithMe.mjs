/** move data from session to state.store
 * @type {import('@enhance/types').EnhanceApiFn} */
export async function get(req) {
	const { error, isAuthorized } = req.session;
	return { json: { error, isAuthorized } };
}
