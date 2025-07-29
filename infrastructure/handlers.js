import { html } from '../lib/html.js';

/**
 * Escape header values to prevent header injection attacks
 * @param {string} value - Header value to escape
 * @returns {string} Escaped header value
 */
function escapeHeaderValue(value) {
	return String(value).replaceAll('\r', '').replaceAll('\n', '').replaceAll('\t', ' ').trim();
}

/**
 * Creates escaped headers object from input headers
 * @param {Object} headers - Input headers object
 * @returns {Object} Escaped headers object
 */
function createEscapedHeaders(headers) {
	const escapedHeaders = {};
	for (const [key, value] of Object.entries(headers)) {
		escapedHeaders[key] = escapeHeaderValue(value);
	}
	return escapedHeaders;
}

/**
 * Creates default content based on page route
 * @param {string} pageRoute - Current page route
 * @returns {string} Default HTML content
 */
function createDefaultContent(pageRoute) {
	if (pageRoute === '/404') {
		return html`<div><p>Page not found</p></div>`;
	}
	return html`<div><p>No content available</p></div>`;
}

/**
 * Creates redirect response
 * @param {Object} result - Handler result object
 * @param {Object} baseResponse - Base response object
 * @returns {Object} Redirect response
 */
function createRedirectResponse(result, baseResponse) {
	return {
		...baseResponse,
		statusCode: result.statusCode || 302,
		headers: { ...baseResponse.headers, Location: result.redirect },
		body: result.body || '',
	};
}

/**
 * Processes object-type handler results
 * @param {Object} result - Handler result object
 * @param {Object} baseResponse - Base response object
 * @returns {Object|undefined} Response object, or undefined if no response should be returned (continue processing)
 */
function processObjectResult(result, baseResponse) {
	const response = { ...baseResponse };

	if (result.statusCode) {
		response.statusCode = result.statusCode;
	}

	if (result.headers) {
		response.headers = { ...response.headers, ...createEscapedHeaders(result.headers) };
	}

	if (result.body !== undefined) {
		response.body = result.body;
		return response;
	}

	if (result.html) {
		response.body = result.html;
		return response;
	}

	if (result.redirect) {
		return createRedirectResponse(result, response);
	}

	// Continue processing - no response to return
}

/**
 * Process handler result into a proper HTTP response
 * @param {*} result - Result from page handler function
 * @param {string} pageRoute - Current page route for status code determination
 * @param {number} defaultStatusCode - Default status code to use
 * @returns {Object} HTTP response object
 */
function processHandlerResult(result, pageRoute, defaultStatusCode = 200) {
	// Early return for complete response objects
	if (result && typeof result === 'object' && result.statusCode) {
		return result;
	}

	// Build base response object
	const baseResponse = {
		statusCode: defaultStatusCode,
		headers: { 'Content-Type': 'text/html' },
		body: '',
	};

	// Handle object results
	if (result && typeof result === 'object') {
		const objectResponse = processObjectResult(result, baseResponse);
		if (objectResponse) {
			return objectResponse;
		}
		// Fall through to default content for empty objects
	}

	// Handle string results
	if (typeof result === 'string') {
		return {
			...baseResponse,
			statusCode: pageRoute === '/404' ? 404 : defaultStatusCode,
			body: result,
		};
	}

	// Default case - no result or empty object
	return {
		...baseResponse,
		statusCode: pageRoute === '/404' ? 404 : defaultStatusCode,
		body: createDefaultContent(pageRoute),
	};
}

/**
 * Request handler for routes created by /pages
 * Handles dynamic page routing with proper bundling support
 *
 * @param {Object} event - Lambda event object
 * @param {Object} context - Lambda context object
 * @returns {Promise<Object>} HTTP response
 */
export async function pageHandler(event, context) {
	try {
		const pageRoute = process.env.PAGE_ROUTE;
		if (!pageRoute) {
			throw new Error('PAGE_ROUTE environment variable is required');
		}

		// Import the page module using its actual path
		// The page path is passed via environment variable during CDK deployment
		const pagePath = process.env.PAGE_PATH || './pages/index.js';
		const pageModule = await import(pagePath);

		const methodMap = {
			get: pageModule.get,
			post: pageModule.post,
			put: pageModule.put,
			delete: pageModule.del, // Note: 'del' export maps to 'delete' method
		};

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
			const result = await handlerFunction(event, context);
			return processHandlerResult(result, pageRoute);
		} catch (error) {
			console.error('📄❌ Handler error:', error);
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
		console.error('📄💥 Page handler error:', error);
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
