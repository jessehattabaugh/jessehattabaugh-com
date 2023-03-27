/** @type {import('@enhance/types').EnhanceApiFn} */
export async function post(req) {
	console.log('🌋', req.body);
	const { test, title, url } = req.body;
	if (test || title || url) {
		// send the share somewhere
		return { location: '/thanks' };
	} else {
		return {
			session: { error: 'you have to share something' },
			location: '/share',
		};
	}
}

/** @type {import('@enhance/types').EnhanceApiFn} */
export async function get(req) {
	const { test, title, url } = req.query;
	const { error, ...session } = req.session;
	return { json: { test, title, url, error }, session };
}
