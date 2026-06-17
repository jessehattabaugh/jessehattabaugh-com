import { html, Raw } from '../html.js';

/**
 * @param {object} opts
 * @param {string} opts.title
 * @param {Raw | string} opts.body
 * @param {string} [opts.description]
 * @param {string} [opts.path]
 * @returns {Raw}
 */
export const layout = ({
	title,
	body,
	description = 'Personal website of Jesse Hattabaugh, a software engineer.',
	path = '',
}) => {
	const normalizedPath = path !== '/' && path.endsWith('/') ? path.slice(0, -1) : path;

	return html`<!doctype html>
		<html lang="en">
			<head>
				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title>${title} — Jesse Hattabaugh</title>
				<meta name="description" content="${description}" />
				<link rel="stylesheet" href="/styles/main.css" />
				<link rel="icon" href="/favicon.ico" sizes="any" />
				<style>
					@view-transition {
						navigation: auto;
					}
				</style>
				<script type="speculationrules">
					{
						"prerender": [
							{ "where": { "href_matches": "/*" }, "eagerness": "moderate" }
						]
					}
				</script>
			</head>
			<body>
				<a class="skip-link" href="#main">Skip to content</a>
				<header>
					<nav aria-label="Main navigation">
						<a class="site-title${normalizedPath === '/' ? ' current' : ''}" href="/"
							>Jesse Hattabaugh</a
						>
						<ul>
							<li>
								<a
									href="/about"
									${normalizedPath === '/about' ? ' aria-current="page"' : ''}
									>About</a
								>
							</li>
							<li>
								<a
									href="/apps/messages/"
									${normalizedPath === '/apps/messages'
										? ' aria-current="page"'
										: ''}
									>Send me a message</a
								>
							</li>
							<li>
								<a
									href="/colophon"
									${normalizedPath === '/colophon' ? ' aria-current="page"' : ''}
									>Colophon</a
								>
							</li>
						</ul>
					</nav>
				</header>
				<main id="main">${body instanceof Raw ? body : new Raw(String(body))}</main>
				<footer>
					<p>
						&copy; Jesse Hattabaugh &middot;
						<a href="/colophon">How this site works</a>
					</p>
				</footer>
				<script type="module" src="/enhance/index.js"></script>
			</body>
		</html>`;
};
