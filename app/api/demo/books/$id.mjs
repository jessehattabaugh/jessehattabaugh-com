/**  @param {import("@enhance/types").EnhanceApiReq} request */
async function testResponse(request) {
	// get the mock value from the request body if the request is a POST, otherwise from the request params
	const { method, body, query, path } = request;
	const { mock } = method === 'POST' ? body : query;

	const { method: queryMethod, newTitle } = query;
	const deleted = method == 'DELETE' || queryMethod == 'DELETE';

	const { title, method: bodyMethod } = request.body;
	const edited = method == 'PUT' || bodyMethod == 'PUT';

	// wait two seconds to simulate a slow response
	await new Promise((resolve) => {
		setTimeout(resolve, 500);
	});

	console.debug('📗 /demo/book/$id testResponse', {
		body,
		deleted,
		path,
		method,
		mock,
		query,
		queryMethod,
	});
	if (mock === 'error') {
		return { json: { error: 'mock error' }, status: 500 };
	} else if (method === 'POST') {
		// pass the edited title in the redirect url
		return { location: path + '?newTitle=' + title };
	} else {
		return { json: { success: true, deleted, edited, title: newTitle || 'Book 1' } };
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
	const { method } = request.body;
	console.debug('🏣 /api/test POST request', { method });

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
