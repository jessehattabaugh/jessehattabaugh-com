/**
 * Universal Lambda handler that routes HTTP methods to the appropriate page functions
 * @param {Object} pageModule - The page module containing HTTP method functions
 * @returns {Function} Lambda handler function
 */
export function createHandler(pageModule) {
	return async (event, context) => {
		const method = event.httpMethod?.toLowerCase() || 'get';

		// Map HTTP methods to function names
		const methodMap = {
			get: pageModule.get,
			post: pageModule.post,
			put: pageModule.put,
			delete: pageModule.del,
		};

		const handlerFunction = methodMap[method];

		if (!handlerFunction) {
			const availableMethods = Object.keys(methodMap)
				.filter((m) => methodMap[m])
				.map((m) => m.toUpperCase());

			return {
				statusCode: 405,
				headers: {
					'Content-Type': 'application/json',
					Allow: availableMethods.join(', '),
				},
				body: JSON.stringify({
					error: 'Method Not Allowed',
					message: `HTTP method ${method.toUpperCase()} is not supported for this endpoint`,
				}),
			};
		}

		try {
			return await handlerFunction(event, context);
		} catch (error) {
			console.error('Handler error:', error);
			return {
				statusCode: 500,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					error: 'Internal Server Error',
					message: 'An error occurred while processing your request',
				}),
			};
		}
	};
}
