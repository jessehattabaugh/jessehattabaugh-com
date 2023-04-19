import arc from '@architect/functions';

/** @type {import('@enhance/types').EnhanceApiFn} */
export async function get(request) {
	const { session } = request;
	const { isAuthorized } = session;
	try {
		const db = await arc.tables();
		const result = await db.shares.scan({
			FilterExpression: 'attribute_exists(isAuthorized)',
			Limit: 100,
		});
		const { Items: shares } = result;
		return { json: { isAuthorized, shares } };
	} catch (error) {
		console.error('🛟', error);
		return { json: { error } };
	}
}
