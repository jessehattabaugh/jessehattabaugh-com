/** unauthenticates the user
 * @type {import('@enhance/types').EnhanceApiFn} */
export async function get() {
	return {
		location: '/',
		session: { isAuthorized: false },
	};
}
