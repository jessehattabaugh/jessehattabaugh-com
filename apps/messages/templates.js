import { html } from '../../shared/html.js';
import { layout } from '../../shared/templates/layout.js';
import { paths } from '../../shared/routes.js';
import { accountSettings, signInLink } from '../../shared/templates/account.js';
import { installControls } from '../../shared/templates/install.js';

/**
 * @typedef {object} MessagesData
 * @property {{ id: string, display_name: string, is_owner: number } | null} [user]
 * @property {Array<{ id: string, display_name: string, href: string }>} [conversations]
 * @property {Array<{ id: string, content: string, senderName: string, sent: boolean, createdAt: string, verified: number }>} [messages]
 * @property {string} [conversationId]
 * @property {string} [refreshHref]
 * @property {string} [error]
 * @property {string} [notice]
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
				${(data.conversations ?? []).map((conversation) => { return html`<option value="${conversation.id}">${conversation.display_name}</option>`; })}
			</select>`}
		<label for="message">Message</label>
		<textarea id="message" name="message" rows="4" maxlength="10000" required>${data.values?.message ?? ''}</textarea>
		<button type="submit" class="btn">Send</button>
	</form>`;
}

/** @param {MessagesData} data */
export function messagesFragment(data = {}) {
	const { user, error, notice, values = {} } = data;
	function screenContent() {
		if (user) {
			return html`
				${data.conversations ? html`
					<nav aria-label="Conversations"><h2>Conversations</h2><ul>
						${data.conversations.map((conversation) => { return html`<li><a href="${conversation.href}" data-target="#main" ${conversation.id === data.conversationId ? html`aria-current="page"` : html``}>${conversation.display_name}</a></li>`; })}
					</ul></nav>` : html``}
				${data.refreshHref ? html`
					<section aria-label="Conversation">
						<h2>Message history</h2>
						<a href="${data.refreshHref}" data-target="#main" data-poll>Refresh messages</a>
						<ol aria-label="Messages">
							${(data.messages ?? []).map((message) => { return html`
								<li data-sent="${String(message.sent)}"><article>
									<p>${message.content}</p>
									<p><strong>${message.senderName}</strong> · <span>${message.verified ? 'Verified' : 'Unverified'}</span> · <time datetime="${message.createdAt}">${message.createdAt.replace('T', ' ').replace(/\.\d+Z$/, ' UTC')}</time></p>
								</article></li>`; })}
						</ol>
						${data.messages?.length ? html`` : html`<p>No messages yet.</p>`}
						${composer(data)}
					</section>` : html`<p>Select a conversation to read messages and reply.</p>${data.conversations?.length ? composer(data) : html``}`}
				${data.vapidPublicKey ? html`
					<form method="post" action="${paths.messagePush}" data-return="${paths.messages}" data-push data-key="${data.vapidPublicKey}" data-no-enhance hidden>
						<button type="submit" class="btn btn--outline" aria-pressed="false">Enable message notifications</button>
					</form>` : html``}

				${accountSettings({ user, email: values.email, canRegister: data.canRegister, canUpdateEmail: data.canUpdateEmail, canSetup: data.canSetup })}
			`;
		}
		return html`
				<p>Send Jesse a message now. Verify your email afterward to notify Jesse and read replies.</p>
				<form method="post" action="${paths.messages}" data-target="#main" aria-label="Send message">
					<label for="name">Name</label>
					<input id="name" name="name" autocomplete="name" maxlength="100" required value="${values.name ?? ''}" />
					<label for="email">Email</label>
					<input id="email" name="email" type="email" autocomplete="email" required value="${values.email ?? ''}" />
					<label for="message">Message</label>
					<textarea id="message" name="message" rows="5" maxlength="10000" required>${values.message ?? ''}</textarea>
					<button type="submit" class="btn">Send</button>
				</form>
				${signInLink({ label: 'Sign in to your conversation', explanation: ' to verify your email, notify Jesse for a timely response, and read replies on any device.' })}
			`;
	}
	return html`
		<article data-messages>
			<img src="/apps/messages/icon.svg" alt="" width="64" height="64" />
			<h1>Jessages</h1><p>Messages to Jesse</p>
			${error ? html`<p role="alert">${error}</p>` : html``}
			${notice ? html`<p role="status">${notice}</p>` : html``}
			${screenContent()}
			<p role="status" aria-label="Browser features" data-browser-status></p>
			${installControls('Jessages', 'Install this app to be notified of replies')}
		</article>`;
}

/** @param {MessagesData} [data] */
export function messagesPage(data = {}) {
	return layout({
		title: 'Jessages — Messages to Jesse',
		path: paths.messages, app: 'messages', user: data.user,
		description: 'Send Jesse a message and read replies on any device.',
		body: messagesFragment(data),
		head: html`<link rel="manifest" href="/apps/messages/manifest.webmanifest" /><link rel="stylesheet" href="/apps/messages/styles.css" />`,
		scripts: html`<script type="module" src="/apps/messages/app.js" data-service-worker="/apps/messages/sw.js" data-scope="/apps/messages/"></script>`,
	});
}
