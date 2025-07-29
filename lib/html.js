/**
 * Helper function to escape special characters in strings
 * @param {any} value - The value to be escaped
 * @returns {string} The escaped string
 */
function escapeHtml(value) {
	return String(value)
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

/**
 * Marks a value as trusted HTML that should not be escaped.
 * @param {string} value - The HTML string to mark as raw.
 * @returns {object} The marked value.
 */
export function raw(value) {
	return { __html: String(value) };
}

/**
 * Template literal function for wrapping content in HTML structure
 * @param {TemplateStringsArray} strings - Template strings
 * @param {...any} values - Template values
 * @returns {string} Complete HTML page
 */
export function html(strings, ...values) {
	// Combine template strings and sanitized values
	let content = '';
	for (const [index, string] of strings.entries()) {
		content += string;
		if (index < values.length) {
			const v = values[index];
			content += (v && typeof v === 'object' && v.__html !== undefined)
				? v.__html
				: escapeHtml(v);
		}
	}

	return `<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>Jesse Hattabaugh</title>
		<meta name="description" content="Jesse Hattabaugh's personal website - Software developer passionate about creating amazing web experiences">
		
		<!-- PWA Meta Tags -->
		<link rel="manifest" href="/manifest">
		<meta name="theme-color" content="#2563eb">
		<meta name="apple-mobile-web-app-capable" content="yes">
		<meta name="apple-mobile-web-app-status-bar-style" content="default">
		<meta name="apple-mobile-web-app-title" content="Jesse H">
		<link rel="apple-touch-icon" href="/static/icons/icon-192x192.png">
		
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
			${content}
		</main>
		<footer>
			<p>&copy; ${new Date().getFullYear()} Jesse Hattabaugh</p>
		</footer>
		
		<!-- Service Worker Registration -->
		<script>
			if ('serviceWorker' in navigator) {
				window.addEventListener('load', () => {
					navigator.serviceWorker.register('/static/sw.js')
						.then((registration) => {
							console.info('🔧✅ Service Worker registered successfully:', registration.scope);
						})
						.catch((error) => {
							console.warn('🔧❌ Service Worker registration failed:', error);
						});
				});
			}
		</script>
	</body>
</html>`;
}
