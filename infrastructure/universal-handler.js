/**
 * Universal Lambda handler that routes HTTP methods to the appropriate page functions
 * @param {Object} pageModule - The page module containing HTTP method functions
 * @param {Object} event - Lambda event object
 * @param {Object} context - Lambda context object
 * @returns {Object} HTTP response
 */
async function handleRequest(pageModule, event, context) {
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
}

/**
 * Universal Lambda entry point that dynamically imports a page module
 * and creates a handler for it. The page module path is provided via
 * environment variable.
 */
export const handler = async (event, context) => {
	try {
		// Get the page module path from environment variable
		const pageModulePath = process.env.PAGE_MODULE_PATH;
		if (!pageModulePath) {
			throw new Error('PAGE_MODULE_PATH environment variable is required');
		}

		// Dynamically import the page module
		const pageModule = await import(pageModulePath);

		// Handle the request using the page module
		return await handleRequest(pageModule, event, context);
	} catch (error) {
		console.error('Universal handler error:', error);
		return {
			statusCode: 500,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				error: 'Internal Server Error',
				message: 'Failed to load page module or execute handler',
			}),
		};
	}
};
