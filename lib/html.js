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
 * Generates the site navigation HTML
 * @returns {string} Navigation HTML
 */
export function navigation() {
	return `<nav>
		<a href="/">Home</a>
		<a href="/contact">Contact</a>
		<a href="/about">About</a>
	</nav>`;
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
		<link rel="stylesheet" href="/static/styles/all.css">
	</head>
	<body>
		<header>
			${navigation()}
		</header>
		<main>
			${content}
		</main>
		<footer>
			<p>&copy; ${new Date().getFullYear()} Jesse Hattabaugh</p>
		</footer>
	</body>
</html>`;
}
