import arc from '@architect/functions';

/** @type {import('@enhance/types').EnhanceApiFn} */
export async function get(request) {
	const { session } = request;
	const { isAuthorized } = session;
	const Limit = 100;
	const options = isAuthorized
		? { Limit }
		: {
				ExpressionAttributeValues: { ':true': true },
				FilterExpression: 'isAuthorized = :true',
				Limit,
				ScanIndexForward: false, // reverse createdAt order
		  };
	try {
		const db = await arc.tables();
		const result = await db.shares.scan(options);
		const { Items: shares } = result;
		return { json: { isAuthorized, shares } };
	} catch (error) {
		console.error('🛟', error);
		return { json: { error } };
	}
}
