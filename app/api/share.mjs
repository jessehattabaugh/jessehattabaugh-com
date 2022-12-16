/** @type {import('@enhance/types').EnhanceApiFn} */
export async function post(req) {
	console.log('🌋', req.body);
	return { location: '/thanks' };
}

/** @type {import('@enhance/types').EnhanceApiFn} */
export async function get(req) {
	return { json: req.query };
}
