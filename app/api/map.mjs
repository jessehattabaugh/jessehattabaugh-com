/**
 * @type {import('@enhance/types').EnhanceApiFn} */
export async function get(request) {
	const { xOffset, yOffset } = request.query;
	return {
		json: { xOffset, yOffset },
	};
}
