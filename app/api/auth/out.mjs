/** unauthenticates the user
 * @type {import('@enhance/types').EnhanceApiFn} */
export async function get() {
	return {
		location: '/auth/in',
		session: { isAuthorized: false },
	};
}
