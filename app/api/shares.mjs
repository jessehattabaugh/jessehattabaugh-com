import arc from '@architect/functions';

/** @type {import('@enhance/types').EnhanceApiFn} */
export async function get() {
	try {
		const db = await arc.tables();
		const result = await db.shares.scan({ Limit: 100 });
		const { Items: shares } = result;
		return { json: { shares } };
	} catch (error) {
		console.error('🛟', error);
		return { json: { error } };
	}
}
