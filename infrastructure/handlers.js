import { dirname, join } from 'node:path';

import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
			// Get context data from the page handler
			const contextData = await handlerFunction(event, context);

			// Check if handler returned a direct response (like 405 errors)
			if (contextData && contextData.statusCode) {
				return contextData;
			}

			// Generate template path based on page module path and method
			const templatePath = generateTemplatePath(pageModulePath, method);

			// Dynamically import and render the method-specific template
			const methodTemplate = await import(templatePath);
			const contentHtml = await methodTemplate.default.render(contextData || {});

			// Load the main page template
			const pageTemplate = await import(join(__dirname, '../lib/templates/page.marko'));

			// Get page title based on the page and method
			const title = getPageTitle(pageModulePath, method);

			// Render the full page with the method content
			const html = await pageTemplate.default.render({
				title,
				content: contentHtml,
			});

			// Determine status code (404 for 404 pages, 200 for others)
			const statusCode = pageModulePath.includes('404') ? 404 : 200;

			return {
				statusCode,
				headers: { 'Content-Type': 'text/html' },
				body: html.toString(),
			};
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
			const contextData = await notFoundHandler(event, context);

			// Load 404 method template
			const templatePath = `${baseDir}/pages/404.get.marko`;
			const methodTemplate = await import(templatePath);
			const contentHtml = await methodTemplate.default.render(contextData || {});

			// Load the main page template
			const pageTemplate = await import(join(__dirname, '../lib/templates/page.marko'));

			// Render the full 404 page
			const html = await pageTemplate.default.render({
				title: '404 - Page Not Found',
				content: contentHtml,
			});

			return {
				statusCode: 404,
				headers: { 'Content-Type': 'text/html' },
				body: html.toString(),
			};
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

/**
 * Generate template path based on page module path and HTTP method
 * @param {string} pageModulePath - Path to the page module (e.g., '/pages/hello/index.js')
 * @param {string} method - HTTP method (e.g., 'get', 'post')
 * @returns {string} Template path (e.g., '/pages/hello/index.get.marko')
 */
function generateTemplatePath(pageModulePath, method) {
	// Convert .js to .{method}.marko
	// e.g., '/pages/hello/index.js' -> '/pages/hello/index.get.marko'
	const basePath = pageModulePath.replace(/\.js$/, '');
	return `${basePath}.${method}.marko`;
}

/**
 * Get page title based on page module path and HTTP method
 * @param {string} pageModulePath - Path to the page module
 * @param {string} method - HTTP method
 * @returns {string} Page title
 */
function getPageTitle(pageModulePath, method) {
	if (pageModulePath.includes('404')) {
		return '404 - Page Not Found';
	}

	if (pageModulePath.includes('about')) {
		return 'About Jesse';
	}

	if (pageModulePath.includes('hello')) {
		return method === 'post' ? 'Hello Page - Message Sent!' : 'Hello Page';
	}

	// Default to home page title
	return 'Jesse Hattabaugh';
}
