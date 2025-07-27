/**
 * 404 page handler
 * @param {Object} event - Lambda event object
 * @returns {string} HTML content for the 404 page
 */
export async function get() {
	return `<div class='error-page'>
		<h2>Page Not Found</h2>
		<p>The page you are looking for does not exist or has been moved.</p>
		<div class='error-actions'>
			<a href='/' class='home-link'>← Return to Home</a>
			<p>Or try one of these pages:</p>
			<ul class='page-suggestions'>
				<li><a href='/about'>About</a></li>
				<li><a href='/hello'>Contact</a></li>
			</ul>
		</div>
	</div>`;
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
