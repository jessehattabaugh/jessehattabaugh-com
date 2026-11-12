import { html } from '../html.js';
/** @import { Raw } from '../html.js' */
import { siteAccount } from './account.js';
import { paths, navigationRoutes } from '../routes.js';
import { webCounter } from './web-counter.js';

/**
 * @param {object} opts
 * @param {string} opts.title
 * @param {Raw | string} opts.body
 * @param {string} [opts.description]
 * @param {string} [opts.path]
 * @param {boolean} [opts.viewTransitions]
 * @param {Raw} [opts.head]
 * @param {Raw} [opts.scripts]
 * @param {string} [opts.app] App identity; omitting it selects the site layout.
 * @param {{ display_name: string } | null} [opts.user]
 * @param {{ profileUrl: string, handle: string }} [opts.social]
 * @returns {Raw}
 */
export const layout = ({
	title,
	body,
	description = 'Personal website of Jesse Hattabaugh, a software engineer.',
	path = '',
	viewTransitions = true,
	head = html``,
	scripts = html``,
	app,
	user,
	social,
}) => {
	const normalizedPath = path !== '/' && path.endsWith('/') ? path.slice(0, -1) : path;
	const iconRoot = app ? '.' : '/branding';

	return html`<!doctype html>
		<html lang="en">
			<head>
				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title>${app ? title : `${title} — Jesse Hattabaugh`}</title>
				<meta name="description" content="${description}" />
				<link rel="stylesheet" href="${app ? '/styles/app.css' : '/styles/main.css'}" />
				<link rel="icon" href="${iconRoot}/icon-32.png" type="image/png" sizes="32x32" />
				<link rel="icon" href="${iconRoot}/icon.svg" type="image/svg+xml" sizes="any" />
				<link rel="apple-touch-icon" href="${iconRoot}/apple-touch-icon.png" sizes="180x180" />
				${app || !path ? html`` : html`<link rel="manifest" href="/manifest.webmanifest" />`}
				${head}
				<style>
					/* Chromium can leave transition snapshots intercepting native controls
					   when scripting is disabled. Keep the no-JS baseline interactive. */
					@media (scripting: enabled) {
						@view-transition {
							navigation: ${viewTransitions ? 'auto' : 'none'};
						}
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
			<body data-app="${app ?? ''}">
				<a class="skip-link" href="#main">Skip to content</a>
				${app ? html`<header>
					${siteAccount({ user, returnTo: path })}
				</header>` : html`<header>
					<nav aria-label="Main navigation">
						<a href="/" aria-label="Jesse Hattabaugh"${normalizedPath === '/' ? html` aria-current="page"` : html``}
							><img src="${paths.avatar}" alt="Bluesky avatar" width="36" height="36" />Jesse Hattabaugh</a
						>
						<ul>
							${navigationRoutes.map((route) => {
								const current = normalizedPath === route.path.replace(/\/$/, '') || (route.path.endsWith('/') && path.startsWith(route.path));
								return html`<li><a href="${route.path}"${current ? html` aria-current="page"` : html``}>${route.navigation ?? ''}</a></li>`;
							})}
						</ul>
					</nav>
				</header>`}
				<main id="main">${body}</main>
				<footer>
					${app ? html`` : html`<p>
						&copy; Jesse Hattabaugh &middot;
						<a href="${paths.colophon}">Colophon</a>
						&middot; <a href="${social?.profileUrl ?? paths.bluesky}" rel="me">${social ? `@${social.handle} on Bluesky` : 'Bluesky'}</a>
					</p>`}
					${webCounter()}
				</footer>
				<script type="module" src="/enhance/index.js"></script>
				${scripts}
			</body>
		</html>`;
};
