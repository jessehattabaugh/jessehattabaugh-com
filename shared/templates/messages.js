import { html } from '../html.js';

/** @returns {import('../html.js').Raw} */
const ownerNotice = () => {
	return html`
		<main class="ssr-fallback">
			<h1>Messages</h1>
			<p>You're signed in as the owner. Enable JavaScript to view and reply to conversations.</p>
		</main>
	`;
};

/**
 * @param {{ sent: boolean, error?: string, values: { name?: string, email?: string, message?: string } }} opts
 * @returns {import('../html.js').Raw}
 */
const guestForm = ({ sent, error, values }) => {
	return html`
		<main class="ssr-fallback">
			<h1>Send Jesse a message</h1>
			${sent
				? html`<p class="success" role="status">
						Message sent — Jesse will get back to you.
					</p>`
				: html``}
			${error ? html`<p class="error" role="alert">${error}</p>` : html``}
			<p>Enable JavaScript to receive replies and see your message history.</p>
			<form method="post" action="/apps/messages/">
				<div class="field">
					<label for="name">Name</label>
					<input
						id="name"
						name="name"
						type="text"
						autocomplete="name"
						required
						value="${values.name ?? ''}"
					/>
				</div>
				<div class="field">
					<label for="email">Email</label>
					<input
						id="email"
						name="email"
						type="email"
						autocomplete="email"
						required
						value="${values.email ?? ''}"
					/>
				</div>
				<div class="field">
					<label for="message">Message</label>
					<textarea id="message" name="message" rows="5" required>
${values.message ?? ''}</textarea
					>
				</div>
				<button type="submit">Send</button>
			</form>
		</main>
	`;
};

/**
 * The Messages PWA document shell.
 *
 * Server-rendered for every request — this is the no-JS baseline (a guest can
 * always send a message via the plain `<form>` below) and the mount point the
 * client app upgrades once JavaScript is available. There is exactly one
 * markup source: `app.js` removes `#ssr-fallback` on boot instead of a second
 * implementation re-rendering the same thing.
 *
 * @param {object} [opts]
 * @param {'guest' | 'owner'} [opts.viewerRole]
 * @param {boolean} [opts.sent]
 * @param {string} [opts.error]
 * @param {{ name?: string, email?: string, message?: string }} [opts.values]
 * @returns {import('../html.js').Raw}
 */
export const messagesPage = ({ viewerRole = 'guest', sent = false, error, values = {} } = {}) => {
	return html`<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>Messages — Jesse Hattabaugh</title>
		<meta name="description" content="Send Jesse Hattabaugh a message." />
		<meta name="theme-color" content="#06b6d4" />

		<link rel="manifest" href="/apps/messages/manifest.json" />
		<link rel="icon" href="/apps/messages/icon.svg" type="image/svg+xml" />
		<link rel="apple-touch-icon" href="/apps/messages/icon.svg" />
		<link rel="stylesheet" href="/apps/messages/styles.css" />

		<style>
			@view-transition {
				navigation: auto;
			}
		</style>
	</head>
	<body>
		<messages-app></messages-app>

		<div id="ssr-fallback">
			${viewerRole === 'owner' ? ownerNotice() : guestForm({ sent, error, values })}
		</div>

		<script type="module" src="/apps/messages/app.js"></script>
	</body>
</html>
`;
};
