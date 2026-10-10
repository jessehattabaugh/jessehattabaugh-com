import { html } from '../html.js';
import { layout } from './layout.js';
import { paths } from '../routes.js';
import { installControls } from './install.js';

/**
 * @typedef {object} MessagesData
 * @property {{ id: string, display_name: string, is_owner: number } | null} [user]
 * @property {Array<{ id: string, display_name: string, href: string }>} [conversations]
 * @property {Array<{ id: string, content: string, senderName: string, sent: boolean, createdAt: string }>} [messages]
 * @property {string} [conversationId]
 * @property {string} [refreshHref]
 * @property {string} [error]
 * @property {string} [notice]
 * @property {string} [vapidPublicKey]
 * @property {{ name?: string, email?: string, message?: string }} [values]
 */

/** @param {MessagesData} data */
function composer(data) {
	let recipient = html``;
	if (data.conversationId) {
		recipient = html`<input type="hidden" name="conversationId" value="${data.conversationId}" />`;
	} else if (data.user?.is_owner) {
		recipient = html`
			<label for="recipient">Conversation</label>
			<select id="recipient" name="conversationId" required>
				<option value="">Choose a conversation</option>
				${(data.conversations ?? []).map((conversation) => {return html`<option value="${conversation.id}">${conversation.display_name}</option>`})}
			</select>`;
	}
	return html`<form method="post" action="${paths.messages}" data-target="#main" aria-label="Send message">
		${recipient}
		<label for="message">Message</label>
		<textarea id="message" name="message" rows="4" maxlength="10000" required>${data.values?.message ?? ''}</textarea>
		<button type="submit" class="btn">Send</button>
	</form>`;
}

/** @param {MessagesData} data */
export function messagesFragment(data = {}) {
	const { user, error, notice, values = {} } = data;
	return html`
		<article data-messages>
			<h1>Messages</h1>
			${error ? html`<p role="alert">${error}</p>` : html``}
			${notice ? html`<p role="status">${notice}</p>` : html``}
			${user ? html`
				<p>Signed in as ${user.display_name}.</p>
				<form method="post" action="${paths.logout}" data-no-enhance>
					<input type="hidden" name="returnTo" value="messages" />
					<button type="submit" class="btn btn--outline">Sign out</button>
				</form>
				${data.conversations ? html`
					<nav aria-label="Conversations"><h2>Conversations</h2><ul>
						${data.conversations.map((conversation) => {return html`<li><a href="${conversation.href}" data-target="#main" ${conversation.id === data.conversationId ? html`aria-current="page"` : html``}>${conversation.display_name}</a></li>`})}
					</ul></nav>` : html``}
				${data.refreshHref ? html`
					<section aria-label="Conversation">
						<h2>Message history</h2>
						<a href="${data.refreshHref}" data-target="#main" data-poll>Refresh messages</a>
						<ol aria-label="Messages">
							${(data.messages ?? []).map((message) => {return html`
								<li data-sent="${String(message.sent)}"><article>
									<p>${message.content}</p>
									<p><strong>${message.senderName}</strong> · <time datetime="${message.createdAt}">${message.createdAt.replace('T', ' ').replace(/\.\d+Z$/, ' UTC')}</time></p>
								</article></li>`})}
						</ol>
						${data.messages?.length ? html`` : html`<p>No messages yet.</p>`}
						${composer(data)}
					</section>` : html`<p>Select a conversation to read messages and reply.</p>${data.conversations?.length ? composer(data) : html``}`}
				${data.vapidPublicKey ? html`
					<form method="post" action="${paths.messagePush}" data-return="${paths.messages}" data-push data-key="${data.vapidPublicKey}" data-no-enhance hidden>
						<button type="submit" class="btn btn--outline" aria-pressed="false">Enable message notifications</button>
					</form>` : html``}
				<p><a href="${paths.account}">Manage your account</a></p>
			` : html`
				<p>Send Jesse a message. Confirm your email to send it, read replies, and return on another device.</p>
				<p><a href="${paths.login}?returnTo=messages">Sign in to your conversation</a></p>
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
		// Chromium navigation snapshots can block controls with JavaScript disabled.
		viewTransitions: false,
		title: 'Messages',
		path: paths.messages,
		description: 'Send Jesse a message and read replies on any device.',
		body: messagesFragment(data),
		head: html`<link rel="manifest" href="/apps/messages/manifest.json" /><link rel="icon" href="/apps/messages/icon.svg" type="image/svg+xml" /><link rel="stylesheet" href="/apps/messages/styles.css" />`,
		scripts: html`<script type="module" src="/apps/messages/app.js" data-service-worker="/apps/messages/sw.js" data-scope="/apps/messages/"></script>`,
	});
}
