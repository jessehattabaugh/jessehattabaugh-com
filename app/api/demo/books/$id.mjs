/**  @param {import("@enhance/types").EnhanceApiReq} request */
async function testResponse(request) {
	// get the mock value from the request body if the request is a POST, otherwise from the request params
	const { method, body, query } = request;
	const { mock } = method === 'POST' ? body : query;

	// wait two seconds to simulate a slow response
	await new Promise((resolve) => {
		setTimeout(resolve, 2000);
	});

	console.debug('📗 /demo/book/$id testResponse', { mock, method, body, query });

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
	// console.debug('🔍 /api/test GET request');
	return testResponse(request);
}

/**
 * @type {import('@enhance/types').EnhanceApiFn}
 */
export async function put(request) {
	console.debug('📤 /demo/books/$id PUT request');
	return testResponse(request);
}

/**
 * @type {import('@enhance/types').EnhanceApiFn}
 */
export async function destroy(request) {
	console.debug('🗑 /demo/books/$id DELETE request');
	return testResponse(request);
}

/**
 * @type {import('@enhance/types').EnhanceApiFn}
 */
export async function post(request) {
	// console.debug('🏣 /api/test POST request');
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
