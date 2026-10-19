import { html } from '../html.js';
/** @import { Raw } from '../html.js' */
import { paths } from '../routes.js';

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
 * @param {import('../data/atproto.js').Social} [opts.social]
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

	return html`<!doctype html>
		<html lang="en">
			<head>
				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title>${app ? title : `${title} — Jesse Hattabaugh`}</title>
				<meta name="description" content="${description}" />
				<link rel="stylesheet" href="${app ? '/styles/app.css' : '/styles/main.css'}" />
				<link rel="icon" href="/icon.svg" type="image/svg+xml" />
				${head}
				<style>
					@view-transition {
						navigation: ${viewTransitions ? 'auto' : 'none'};
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
					<nav aria-label="Site account">
						<a href="${paths.home}" aria-label="Jesse Hattabaugh home" title="Jesse Hattabaugh"><img src="/icon.svg" alt="" width="36" height="36" /></a>
						${user ? html`<p>Signed in as ${user.display_name}.</p><form method="post" action="${paths.logout}" data-no-enhance><button type="submit">Sign out</button></form>` : html`<span>Signed out</span><a href="${app === 'lightsfinder' ? `${paths.login}?returnTo=lightsfinder` : paths.login}">Sign in</a>`}
					</nav>
				</header>` : html`<header>
					<nav aria-label="Main navigation">
						<a href="/" aria-label="Jesse Hattabaugh"${normalizedPath === '/' ? html` aria-current="page"` : html``}
							>${social?.profile?.avatar ? html`<img src="${paths.atAvatar}" alt="Bluesky avatar" width="36" height="36" />` : html``}Jesse Hattabaugh</a
						>
						<ul>
							<li><a href="${paths.giving}"${normalizedPath === paths.giving ? html` aria-current="page"` : html``}>Giving away</a></li>
							<li>
								<a
									href="/about"
									${normalizedPath === '/about' ? html` aria-current="page"` : html``}
									>About</a
								>
							</li>
							<li>
								<a
									href="/apps/"
									${normalizedPath === '/apps' ? html` aria-current="page"` : html``}
									>Apps</a
								>
							</li>
							<li>
								<a
									href="/apps/messages/"
									${normalizedPath === '/apps/messages'
										? html` aria-current="page"`
										: html``}
									>Send me a message</a
								>
							</li>
						</ul>
					</nav>
				</header>`}
				<main id="main">${body}</main>
				${app ? html`` : html`<footer>
					<p>
						&copy; Jesse Hattabaugh &middot;
						<a href="/colophon">How this site works</a>
						&middot; <a href="${social?.profileUrl ?? paths.bluesky}" rel="me">${social ? `@${social.handle} on Bluesky` : 'Bluesky'}</a>
					</p>
				</footer>`}
				<script type="module" src="/enhance/index.js"></script>
				${scripts}
			</body>
		</html>`;
};
