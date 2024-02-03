import arc from '@architect/functions';

/** delete a share
 * @type {import('@enhance/types').EnhanceApiFn}
 */
export async function destroy(request) {
	const { createdAt, shareId } = request.params;
	const { isAuthorized } = request.session;
	console.debug(`💌destroying a share`, { isAuthorized, createdAt, shareId });
	if (isAuthorized) {
		try {
			const db = await arc.tables();
			const result = await db.shares.delete({ createdAt: parseInt(createdAt), shareId });
			console.debug('🗑 share deleted', result);
			return { location: '/shares' };
		} catch (error) {
			console.error(`📢 error deleting share`, error);
			return { json: { error }, location: '/shares' };
		}
	}
	console.error('🐞 not authorized');
	return { json: { error: 'not authorized' }, location: '/shares' };
}

/** accept POST requests to delete a share
 * @type {import('@enhance/types').EnhanceApiFn}
 */
export async function post(request) {
	return destroy(request);
}