/** mock a delete request
 * @type {import('@enhance/types').EnhanceApiFn}
 */
export async function destroy(request) {
	const { testInput } = request.body;
	if (testInput === 'error') {
		return { json: { error: 'mock error' }, status: 500 };
	} else {
		return { json: { success: true } };
	}
}
