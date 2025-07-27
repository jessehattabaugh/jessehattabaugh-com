/**
 * Request handler for routes created by /pages
 *
 * @param {Object} event - Lambda event object
 * @param {Object} context - Lambda context object
 * @returns {Promise<Object>} HTTP response
 */
export async function pageHandler(event, context) {
	try {
		// Get the page module path from environment variable
		const pageModulePath = process.env.PAGE_MODULE_PATH;
		if (!pageModulePath) {
			throw new Error('PAGE_MODULE_PATH environment variable is required');
		}

		// Dynamically import the page module
		const pageModule = await import(pageModulePath);

		// Create method map from the imported page module
		const methodMap = {
			get: pageModule.get,
			post: pageModule.post,
			put: pageModule.put,
			delete: pageModule.del, // Note: 'del' export maps to 'delete' method
		};

		// Handle the HTTP request method
		const method = event.httpMethod?.toLowerCase() || 'get';
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
	} catch (error) {
		console.error('Page handler error:', error);

		// If the page module failed to load, try to fall back to 404.js
		try {
			console.log('Falling back to 404 page');
			const baseDir = process.env.BASE_DIR || process.cwd();
			const notFoundModule = await import(`${baseDir}/pages/404.js`);
			const method = event.httpMethod?.toLowerCase() || 'get';
			const notFoundHandler = notFoundModule[method] || notFoundModule.get;
			return await notFoundHandler(event, context);
		} catch (fallbackError) {
			console.error('404 fallback also failed:', fallbackError);
			return {
				statusCode: 500,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					error: 'Internal Server Error',
					message: 'Failed to load page module or execute handler',
				}),
			};
		}
	}
}
