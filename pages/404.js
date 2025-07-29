import { html } from '../lib/html.js';

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
		body: html`<div class="error-page">
			<h2>Page Not Found</h2>
			<p>The page you are looking for does not exist or has been moved.</p>
			<div class="error-actions">
				<a href="/" class="home-link">← Return to Home</a>
				<p>Or try one of these pages:</p>
				<ul class="page-suggestions">
					<li><a href="/about">About</a></li>
					<li><a href="/contact">Contact</a></li>
				</ul>
			</div>
		</div>`,
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
