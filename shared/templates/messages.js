import { html } from '../html.js';
import { layout } from './layout.js';
import { paths } from '../routes.js';
import { installControls } from './install.js';

/**
 * @typedef {object} MessagesData
 * @property {'messages' | 'login' | 'verify'} [screen]
 * @property {{ id: string, display_name: string, is_owner: number } | null} [user]
 * @property {Array<{ id: string, display_name: string, href: string }>} [conversations]
 * @property {Array<{ id: string, content: string, senderName: string, sent: boolean, createdAt: string }>} [messages]
 * @property {string} [conversationId]
 * @property {string} [refreshHref]
 * @property {string} [error]
 * @property {string} [notice]
 * @property {string} [token]
 * @property {boolean} [canSetup]
 * @property {boolean} [canRegister]
 * @property {boolean} [canUpdateEmail]
 * @property {string} [vapidPublicKey]
 * @property {{ name?: string, email?: string, message?: string }} [values]
 */

/** @param {MessagesData} data */
function composer(data) {
	return html`<form method="post" action="${paths.messages}" data-target="#main" aria-label="Send message">
		${data.conversationId ? html`<input type="hidden" name="conversationId" value="${data.conversationId}" />` : html`
			<label for="recipient">Conversation</label>
			<select id="recipient" name="conversationId" required>
				<option value="">Choose a conversation</option>
				${(data.conversations ?? []).map((conversation) => html`<option value="${conversation.id}">${conversation.display_name}</option>`)}
			</select>`}
		<label for="message">Message</label>
		<textarea id="message" name="message" rows="4" maxlength="10000" required>${data.values?.message ?? ''}</textarea>
		<button type="submit" class="btn">Send</button>
	</form>`;
}

/** @param {MessagesData} data */
export function messagesFragment(data = {}) {
	const { screen = 'messages', user, error, notice, values = {} } = data;
	return html`
		<article data-messages>
			<h1>${screen === 'login' ? 'Sign in' : screen === 'verify' ? 'Confirm your email' : 'Messages'}</h1>
			${error ? html`<p role="alert">${error}</p>` : html``}
			${notice ? html`<p role="status">${notice}</p>` : html``}
			${screen === 'verify' ? html`
				<p>Confirm to sign in and finish your request. This link can be used once.</p>
				${data.token ? html`
					<form method="post" action="${paths.verify}" data-no-enhance>
						<input type="hidden" name="token" value="${data.token}" />
						<button type="submit" class="btn">Confirm email</button>
					</form>` : html`<a href="${paths.login}">Request a new sign-in link</a>`}
			` : screen === 'login' ? html`
				<p>Use an email link to sign in on any device, with or without JavaScript.</p>
				<form method="post" action="${paths.login}" data-target="#main" aria-label="Email sign-in">
					<label for="login-name">Name</label>
					<input id="login-name" name="name" autocomplete="name" maxlength="100" required value="${values.name ?? ''}" />
					<label for="login-email">Email</label>
					<input id="login-email" name="email" type="email" autocomplete="email" required value="${values.email ?? ''}" />
					<button type="submit" class="btn">Email me a sign-in link</button>
				</form>
				<form method="post" action="${paths.loginBegin}" data-passkey="login" data-complete="${paths.loginComplete}" data-no-enhance hidden>
					<button type="submit" class="btn btn--outline">Sign in with a passkey</button>
				</form>
			` : user ? html`
				<p>Signed in as ${user.display_name}.</p>
				<form method="post" action="${paths.logout}" data-no-enhance>
					<button type="submit" class="btn btn--outline">Sign out</button>
				</form>
				${data.conversations ? html`
					<nav aria-label="Conversations"><h2>Conversations</h2><ul>
						${data.conversations.map((conversation) => html`<li><a href="${conversation.href}" data-target="#main" ${conversation.id === data.conversationId ? html`aria-current="page"` : html``}>${conversation.display_name}</a></li>`)}
					</ul></nav>` : html``}
				${data.refreshHref ? html`
					<section aria-label="Conversation">
						<h2>Message history</h2>
						<a href="${data.refreshHref}" data-target="#main" data-poll>Refresh messages</a>
						<ol aria-label="Messages">
							${(data.messages ?? []).map((message) => html`
								<li data-sent="${String(message.sent)}"><article>
									<p>${message.content}</p>
									<p><strong>${message.senderName}</strong> · <time datetime="${message.createdAt}">${message.createdAt.replace('T', ' ').replace(/\.\d+Z$/, ' UTC')}</time></p>
								</article></li>`)}
						</ol>
						${data.messages?.length ? html`` : html`<p>No messages yet.</p>`}
						${composer(data)}
					</section>` : html`<p>Select a conversation to read messages and reply.</p>${data.conversations?.length ? composer(data) : html``}`}
				${data.canRegister ? html`
					<form method="post" action="${paths.registerBegin}" data-passkey="register" data-complete="${paths.registerComplete}" data-no-enhance hidden>
						<input type="hidden" name="displayName" value="${user.display_name}" />
						<input type="hidden" name="email" value="${values.email ?? ''}" />
						<button type="submit" class="btn btn--outline">Add a passkey</button>
					</form>` : html``}
				${data.vapidPublicKey ? html`
					<form method="post" action="${paths.messagePush}" data-return="${paths.messages}" data-push data-key="${data.vapidPublicKey}" data-no-enhance hidden>
						<button type="submit" class="btn btn--outline" aria-pressed="false">Enable message notifications</button>
					</form>` : html``}
				${data.canSetup ? html`
					<details><summary>Set up the site owner</summary>
						<form method="post" action="${paths.setup}" data-target="#main">
							<label for="setup-token">Owner setup token</label>
							<input id="setup-token" name="setupToken" type="password" required />
							<button type="submit" class="btn">Become site owner</button>
						</form>
					</details>` : html``}
				${data.canUpdateEmail ? html`
					<details><summary>Recovery email</summary>
						<p>Confirm an email address to sign in without a passkey on another device.</p>
						<form method="post" action="${paths.profile}" data-target="#main" aria-label="Recovery email">
							<label for="recovery-email">Recovery email</label>
								<input id="recovery-email" name="email" type="email" autocomplete="email" required value="${values.email ?? ''}" />
								<button type="submit" class="btn">Confirm recovery email</button>
							</form>
						</details>` : html``}
			` : html`
				<p>Send Jesse a message. Confirm your email to send it, read replies, and return on another device.</p>
				<p><a href="${paths.login}">Sign in to your conversation</a></p>
				<form method="post" action="${paths.messages}" data-target="#main" aria-label="Send message">
					<label for="name">Name</label>
					<input id="name" name="name" autocomplete="name" maxlength="100" required value="${values.name ?? ''}" />
					<label for="email">Email</label>
					<input id="email" name="email" type="email" autocomplete="email" required value="${values.email ?? ''}" />
					<label for="message">Message</label>
					<textarea id="message" name="message" rows="5" maxlength="10000" required>${values.message ?? ''}</textarea>
					<button type="submit" class="btn">Send</button>
				</form>
			`}
			<p role="status" aria-label="Browser features" data-browser-status></p>
			${installControls('Messages')}
		</article>`;
}

/** @param {MessagesData} [data] */
export function messagesPage(data = {}) {
	return layout({
		title: data.screen === 'login' ? 'Sign in' : 'Messages',
		path: paths.messages,
		description: 'Send Jesse a message and read replies on any device.',
		body: messagesFragment(data),
		head: html`<link rel="manifest" href="/apps/messages/manifest.json" /><link rel="icon" href="/apps/messages/icon.svg" type="image/svg+xml" /><link rel="stylesheet" href="/apps/messages/styles.css" />`,
		scripts: html`<script type="module" src="/apps/messages/app.js" data-service-worker="/apps/messages/sw.js" data-scope="/apps/messages/"></script>`,
	});
}
