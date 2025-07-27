import { dirname, join } from 'node:path';

import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Generate a complete HTML page
 * @param {string} title - Page title
 * @param {string} content - HTML content for the page body
 * @returns {string} Complete HTML page
 */
function generateHtmlPage(title, content) {
	return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title || 'Jesse Hattabaugh'}</title>
    <link rel="stylesheet" href="/static/styles/all.css">
</head>
<body>
    <header>
        <nav>
            <a href="/">Home</a>
            <a href="/hello">Hello</a>
            <a href="/about">About</a>
        </nav>
    </header>
    <main>
        <h1>${title || 'Jesse Hattabaugh'}</h1>
        ${content}
    </main>
</body>
</html>`;
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

			// Check if handler returned a direct response (like 405 errors)
			if (result && result.statusCode) {
				return result;
			}

			// Get page title based on the page and method
			const title = getPageTitle(pageModulePath, method);

			// If result is a string, treat it as HTML content
			// If result is an object with html property, use that
			// Otherwise, result should be an empty object and we'll use default content
			let content = '';
			if (typeof result === 'string') {
				content = result;
			} else if (result && result.html) {
				content = result.html;
			} else {
				// Default content based on page
				content = getDefaultContent(pageModulePath, method);
			}

			// Generate the complete HTML page
			const html = generateHtmlPage(title, content);

			// Determine status code (404 for 404 pages, 200 for others)
			const statusCode = pageModulePath.includes('404') ? 404 : 200;

			return {
				statusCode,
				headers: { 'Content-Type': 'text/html' },
				body: html,
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
			const result = await notFoundHandler(event, context);

			// Get 404 content
			let content = '';
			if (typeof result === 'string') {
				content = result;
			} else if (result && result.html) {
				content = result.html;
			} else {
				content = getDefaultContent(`${baseDir}/pages/404.js`, method);
			}

			// Generate the complete 404 HTML page
			const html = generateHtmlPage('404 - Page Not Found', content);

			return {
				statusCode: 404,
				headers: { 'Content-Type': 'text/html' },
				body: html,
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
