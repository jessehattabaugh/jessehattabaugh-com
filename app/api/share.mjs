/** @type {import('@enhance/types').EnhanceApiFn} */
export async function post() {
	return { location: '/thanks' };
}

/** @type {import('@enhance/types').EnhanceApiFn} */
export async function get(req) {
	return { json: req.query };
}
