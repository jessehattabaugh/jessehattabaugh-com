import { dirname, join } from 'node:path';

import { fileURLToPath } from 'node:url';
import { html } from '../lib/html.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Escape header values to prevent header injection attacks
 * @param {string} value - Header value to escape
 * @returns {string} Escaped header value
 */
function escapeHeaderValue(value) {
	return String(value)
		.replaceAll('\r', '')
		.replaceAll('\n', '')
		.replaceAll('\t', ' ')
		.trim();
}

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
			// Call the page handler function
			const result = await handlerFunction(event, context);

			// Check if handler returned a complete response object
			if (result && typeof result === 'object' && result.statusCode) {
				return result;
			}

			// Handle response objects with optional properties
			let response = {
				statusCode: 200,
				headers: { 'Content-Type': 'text/html' },
				body: '',
			};

			// If result is an object, merge its properties
			if (result && typeof result === 'object') {
				// Copy status code if provided
				if (result.statusCode) {
					response.statusCode = result.statusCode;
				}

				// Merge headers if provided
				if (result.headers) {
					const escapedHeaders = {};
					for (const [key, value] of Object.entries(result.headers)) {
						escapedHeaders[key] = escapeHeaderValue(value);
					}
					response.headers = { ...response.headers, ...escapedHeaders };
				}

				// Handle direct body content (complete HTML responses)
				if (result.body !== undefined) {
					response.body = result.body;
					return response;
				}

				// Handle HTML content for page generation (partial content to be wrapped)
				if (result.html) {
					response.body = result.html;
					return response;
				}

				// Handle redirect responses
				if (result.redirect) {
					response.statusCode = result.statusCode || 302;
					response.headers.Location = result.redirect;
					response.body = result.body || '';
					return response;
				}

				// If object has no recognized response properties, treat as empty and use defaults
			}

			// If result is a string, treat it as complete HTML (from html template literal)
			if (typeof result === 'string') {
				response.body = result;
				// Determine status code (404 for 404 pages, 200 for others)
				response.statusCode = pageModulePath.includes('404') ? 404 : 200;
				return response;
			}

			// If no result or empty object, use default content
			const content = getDefaultContent(pageModulePath, method);
			response.body = html`${content}`;
			response.statusCode = pageModulePath.includes('404') ? 404 : 200;

			return response;
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

		// If the page module failed to load, try to fall back to 404.js
		try {
			console.log('📄🔄 Falling back to 404 page');
			const baseDir = process.env.BASE_DIR || process.cwd();
			const notFoundModule = await import(`${baseDir}/pages/404.js`);
			const method = event.httpMethod?.toLowerCase() || 'get';
			const notFoundHandler = notFoundModule[method] || notFoundModule.get;
			const result = await notFoundHandler(event, context);

			// Handle 404 response using the same logic as normal pages
			let response = {
				statusCode: 404,
				headers: { 'Content-Type': 'text/html' },
				body: '',
			};

			// If result is a complete response object, return it
			if (result && typeof result === 'object' && result.statusCode) {
				return result;
			}

			// If result is an object with response properties
			if (result && typeof result === 'object') {
				if (result.headers) {
					const escapedHeaders = {};
					for (const [key, value] of Object.entries(result.headers)) {
						escapedHeaders[key] = escapeHeaderValue(value);
					}
					response.headers = { ...response.headers, ...escapedHeaders };
				}

				if (result.body !== undefined) {
					response.body = result.body;
					return response;
				}

				if (result.html) {
					response.body = result.html;
					return response;
				}
			}

			// Handle string content (complete HTML from template literal)
			if (typeof result === 'string') {
				response.body = result;
				return response;
			}

			// If no result or empty object, use default content
			const content = getDefaultContent(`${baseDir}/pages/404.js`, method);
			response.body = html`${content}`;

			return response;
		} catch (fallbackError) {
			console.error('📄❌ 404 fallback also failed:', fallbackError);
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
 * Get default content for a page if no content is provided
 * @param {string} pageModulePath - Path to the page module
 * @param {string} method - HTTP method
 * @returns {string} Default HTML content
 */
function getDefaultContent(pageModulePath, method) {
	if (pageModulePath.includes('404')) {
		return `<div class='error-page'>
			<h2>Page Not Found</h2>
			<p>The page you are looking for does not exist.</p>
			<a href='/' class='home-link'>Return to Home</a>
		</div>`;
	}

	if (pageModulePath.includes('about')) {
		return `<div class='about-page'>
			<h2>About Jesse</h2>
			<p>Software developer passionate about creating amazing web experiences.</p>
			<ul>
				<li>Full-stack web development</li>
				<li>Cloud architecture and serverless applications</li>
				<li>Modern JavaScript and web technologies</li>
			</ul>
		</div>`;
	}

	if (pageModulePath.includes('hello')) {
		if (method === 'post') {
			return `<div class='hello-page'>
				<h2>Message Sent!</h2>
				<p>Thank you for your message. I'll get back to you soon!</p>
				<a href='/hello'>Send another message</a>
			</div>`;
		}
		return `<div class='hello-page'>
			<h2>Say Hello!</h2>
			<form method='post' action='/hello'>
				<label for='name'>Name:</label>
				<input type='text' id='name' name='name' required>
				<label for='message'>Message:</label>
				<textarea id='message' name='message' required></textarea>
				<button type='submit'>Send Message</button>
			</form>
		</div>`;
	}

	// Default home page content
	return `<div class='hero'>
		<h2>Welcome to my personal website!</h2>
		<p>I'm a software developer passionate about creating amazing web experiences.</p>

		<section class='intro'>
			<h3>What I Do</h3>
			<ul>
				<li>Full-stack web development</li>
				<li>Cloud architecture and serverless applications</li>
				<li>Modern JavaScript and web technologies</li>
			</ul>
		</section>

		<section class='recent-work'>
			<h3>Recent Projects</h3>
			<p>Check out some of my latest work and experiments.</p>
			<a href='/about' class='cta-button'>Learn More About Me</a>
		</section>
	</div>`;
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
