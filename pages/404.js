import { html, navigation, raw } from '../lib/html.js';

/**
 * 404 page handler
 * @param {Object} event - Lambda event object
 * @returns {Object} Response object with HTML body and 404 status
 */
export async function get() {
	return {
		statusCode: 404,
		headers: {
			'Content-Type': 'text/html',
			'Cache-Control': 'no-cache',
		},
		body: html`<article>
			<h1>Page Not Found</h1>
			<p>The page you are looking for does not exist or has been moved.</p>
			<section>
				<h2>What would you like to do?</h2>
				<p>You can return to the home page or visit one of the available sections:</p>
				${raw(navigation())}
			</section>
		</article>`,
	};
}

// Return 404 for all methods
export async function post() {
	return get();
}
export async function put() {
	return get();
}
export async function del() {
	return get();
}
