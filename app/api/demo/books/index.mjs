/**  @param {import("@enhance/types").EnhanceApiReq} request */
async function testResponse(request) {
	const pages = [
		['Old Man and the Sea', 'Grapes of Wrath', 'Brave New World'],
		['The Handmaids Tale', 'Walden', 'Great Expectations'],
	];
	const { method, body, query } = request;
	const { mock, page } = method === 'POST' ? body : query;

	// wait two seconds to simulate a slow response
	await new Promise((resolve) => {
		setTimeout(resolve, 2000);
	});

	console.debug('📕 /demo/books testResponse', { body, mock, method, page, query });
	if (mock === 'error') {
		return { json: { error: 'mock error' }, status: 500 };
	} else {
		return { json: { books: pages[page], page, success: true } };
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
	// console.debug('📤 /api/test PUT request');
	return testResponse(request);
}

/**
 * @type {import('@enhance/types').EnhanceApiFn}
 */
export async function destroy(request) {
	// console.debug('🗑 /api/test DELETE request');
	return testResponse(request);
}

/**
 * @type {import('@enhance/types').EnhanceApiFn}
 */
export async function post(request) {
	console.debug('🏣 /demo/books POST request');
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
