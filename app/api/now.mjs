import arc from '@architect/functions';

/** load shares from db
 * @type {import('@enhance/types').EnhanceApiFn} */
export async function get(request) {
	const { session } = request;
	const { isAuthorized, error } = session;
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
		return { json: { error, isAuthorized, shares } };
	} catch (error) {
		console.error('🛟 error loading shares', error);
		return { json: { error } };
	}
}