/**
 * @param {import("@enhance/types").EnhanceApiReq} request
 */
function testResponse(request) {
	// get the mock value from the request body if the request is a POST, otherwise from the request params
	const { method, body, query } = request;
	const { mock } = method === 'POST' ? body : query;
	//console.debug('🤡 testResponse', { mock, method, body, query });
	if (mock === 'error') {
		return { json: { error: 'mock error' }, status: 500 };
	} else {
		return { json: { success: true } };
	}
}

/**
 * @type {import('@enhance/types').EnhanceApiFn}
 */
export async function get(request) {
	return testResponse(request);
}

/**
 * @type {import('@enhance/types').EnhanceApiFn}
 */
export async function put(request) {
	return testResponse(request);
}

/**
 * @type {import('@enhance/types').EnhanceApiFn}
 */
export async function destroy(request) {
	return testResponse(request);
}

/**
 * @type {import('@enhance/types').EnhanceApiFn}
 */
export async function post(request) {
	const method = request.body.get('method').toUpperCase();
	switch (method) {
		case 'GET':
			return get(request);
		case 'PUT':
			return put(request);
		case 'DELETE':
			return destroy(request);
		default:
			return testResponse(request);
	}
}
