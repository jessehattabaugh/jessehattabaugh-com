import page from '../lib/templates/page.marko';

export async function get() {
	const html = await page.render({
		title: '404 - Page Not Found',
		content: `
			<div class="error-content">
				<section class="error-message">
					<h2>Oops! Page Not Found 🔍</h2>
					<p>Sorry, the page you are looking for could not be found.</p>
					<p>It might have been moved, deleted, or you may have mistyped the URL.</p>
				</section>

				<section class="suggestions">
					<h3>What can you do?</h3>
					<ul>
						<li>Check the URL for typos</li>
						<li>Go back to the <a href="/">home page</a></li>
						<li>Browse the available pages using the navigation above</li>
					</ul>
				</section>

				<section class="popular-pages">
					<h3>Popular Pages</h3>
					<div class="page-links">
						<a href="/" class="page-link">Home</a>
						<a href="/about" class="page-link">About</a>
						<a href="/hello" class="page-link">Hello</a>
					</div>
				</section>
			</div>
		`,
	});
	return {
		statusCode: 404,
		headers: { 'Content-Type': 'text/html' },
		body: html.toString(),
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
