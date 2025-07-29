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
			<h2>Oops! Page Not Found 🔍</h2>
			<div class="error-message">
				<p>Sorry, the page you are looking for could not be found.</p>
				<p>It might have been moved, deleted, or you may have mistyped the URL.</p>
			</div>
			
			<section class="error-help">
				<h3>What can you do?</h3>
				<ul class="suggestions">
					<li>Check the URL for typos</li>
					<li>Go back to our <a href="/">home page</a></li>
					<li>Browse the available pages using the navigation above</li>
				</ul>
			</section>

			<section class="popular-pages">
				<h3>Popular Pages</h3>
				<div class="page-links">
					<a href="/" class="page-link">Home</a>
					<a href="/about" class="page-link">About</a>
					<a href="/resume" class="page-link">Resume</a>
					<a href="/hello" class="page-link">Hello</a>
				</div>
			</section>
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
