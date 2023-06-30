/** unauthorizes the session and redirects to the login page
 * @type {import('@enhance/types').EnhanceApiFn} */
export function get() {
	// console.debug('🪵🙋‍♂️');
	return {
		location: '/auth',
		session: { isAuthorized: false },
	};
}
