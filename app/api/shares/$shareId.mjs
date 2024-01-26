import arc from '@architect/functions';

/** delete a share
 * @type {import('@enhance/types').EnhanceApiFn} */
export async function destroy(request) {
	const { shareId } = request.params;
	const { isAuthorized } = request.session;
	if (isAuthorized) {
		try {
			const db = await arc.tables();
			const result = await db.shares.delete({ shareId });
			console.debug('🗑 share deleted', result);
			return { location: '/shares' };
		} catch (error) {
			console.error(`📢 error deleting share`, error);
			return { json: { error }, location: '/shares' };
		}
	}
	return { json: { error: 'not authorized' }, location: '/shares' };
}
