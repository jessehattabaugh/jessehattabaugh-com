/**
 * Template literal function for wrapping content in HTML structure
 * @param {TemplateStringsArray} strings - Template strings
 * @param {...any} values - Template values
 * @returns {string} Complete HTML page
 */
export function html(strings, ...values) {
	// Combine template strings and values
	const content = strings.reduce((result, string, index) => {
		return result + string + (values[index] || '');
	}, '');

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
			<p>&copy; 2025 Jesse Hattabaugh</p>
		</footer>
	</body>
</html>`;
}
