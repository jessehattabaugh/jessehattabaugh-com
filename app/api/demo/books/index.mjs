/**  @param {import("@enhance/types").EnhanceApiReq} request */
async function testResponse(request) {
	const pages = [
		['Old Man and the Sea', 'Grapes of Wrath', 'Brave New World'],
		['The Handmaids Tale', 'Walden', 'Great Expectations'],
	];
	const { method, body, query, path } = request;
	const { mock, page = 0, title, newBook } = method === 'POST' ? body : query;
	const books =  pages[page];
	if (newBook) {
		books.push(newBook);
	}
	// wait two seconds to simulate a slow response
	await new Promise((resolve) => {
		setTimeout(resolve, 2000);
	});

	console.debug('📕 /demo/books testResponse', { body, mock, method, page, query });
	if (mock === 'error') {
		return { json: { error: 'mock error' }, status: 500 };
	} else if (method === 'POST') {
		// pass the edited title in the redirect url
		return { location: path + '?newBook=' + title };
	} else {
		return { json: { books, page, success: true } };
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
	const { method } = request.body;
	console.debug('🏣 /demo/books POST request', { method });
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
