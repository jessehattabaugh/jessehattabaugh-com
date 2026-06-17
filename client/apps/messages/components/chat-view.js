import './message-bubble.js';
import './message-input.js';

/**
 * <chat-view> — Full chat interface: conversation list (owner) + thread + compose.
 *
 * Public API:
 *   .init({ user, messages, conversationId, conversations, ownerName, ownerUserId })
 *   .addMessage(msgData)   — append a new message with a view transition
 *   .setConversations(list)
 *   .conversationId        — currently viewed conversation
 *
 * Events dispatched:
 *   'send-message'          { content, conversationId }
 *   'conversation-select'   { conversationId }
 *   'push-subscribe'        (user wants push notifications)
 *   'logout'
 */
export class ChatView extends HTMLElement {
	/** @type {{ id: string, displayName: string, isOwner: boolean } | null} */
	#user = null;
	/** @type {string | null} */
	#conversationId = null;
	#ownerName = 'Jesse';

	get conversationId() {
		return this.#conversationId;
	}

	connectedCallback() {
		this.className = 'chat-view';
	}

	/**
	 * @param {{
	 *   user: { id: string, displayName: string, isOwner: boolean },
	 *   messages: Array<{ id: string, sender_user_id: string, content: string, createdAt: string }>,
	 *   conversationId: string | null,
	 *   conversations?: Array<{ id: string, visitor_user_id: string, display_name: string, last_message: string | null }>,
	 *   ownerName?: string,
	 * }} data
	 */
	init({ user, messages, conversationId, conversations = [], ownerName = 'Jesse' }) {
		this.#user = user;
		this.#conversationId = conversationId;
		this.#ownerName = ownerName;
		this.innerHTML = '';
		this.#buildLayout(conversations);
		this.#renderMessages(messages);
		this.#checkNotificationStatus();
	}

	/** @param {Array<{ id: string, visitor_user_id: string, display_name: string, last_message: string | null }>} conversations */
	#buildLayout(conversations) {
		// Header
		const header = document.createElement('header');
		header.className = 'chat-header';

		const title = document.createElement('div');
		title.className = 'chat-header__title';

		const h1 = document.createElement('h1');
		h1.textContent = this.#user?.isOwner ? 'Messages' : this.#ownerName;
		title.append(h1);

		const actions = document.createElement('div');
		actions.className = 'chat-header__actions';

		this.#notifBtn = document.createElement('button');
		this.#notifBtn.type = 'button';
		this.#notifBtn.className = 'btn btn--ghost chat-header__notif';
		this.#notifBtn.setAttribute('aria-label', 'Enable notifications');
		this.#notifBtn.setAttribute('title', 'Enable notifications');
		this.#notifBtn.textContent = '🔔';
		this.#notifBtn.addEventListener('click', () => {
			this.dispatchEvent(new CustomEvent('push-subscribe', { bubbles: true }));
		});

		const logoutBtn = document.createElement('button');
		logoutBtn.type = 'button';
		logoutBtn.className = 'btn btn--ghost';
		logoutBtn.textContent = 'Sign out';
		logoutBtn.addEventListener('click', () => {
			this.dispatchEvent(new CustomEvent('logout', { bubbles: true }));
		});

		actions.append(this.#notifBtn, logoutBtn);
		header.append(title, actions);

		// Conversation sidebar (owner only)
		let sidebar = null;
		if (this.#user?.isOwner && conversations.length > 0) {
			sidebar = this.#buildSidebar(conversations);
		}

		// Message list
		this.#msgList = document.createElement('div');
		this.#msgList.className = 'chat-messages';
		this.#msgList.setAttribute('role', 'log');
		this.#msgList.setAttribute('aria-live', 'polite');
		this.#msgList.setAttribute('aria-label', 'Messages');

		// Empty state
		this.#emptyState = document.createElement('p');
		this.#emptyState.className = 'chat-empty';
		this.#emptyState.textContent = this.#user?.isOwner
			? 'Select a conversation to view messages.'
			: `No messages yet. Say hello to ${this.#ownerName}!`;

		// Compose
		this.#composeEl = /** @type {import('./message-input.js').MessageInput} */ (
			document.createElement('message-input')
		);
		this.#composeEl.addEventListener('send-message', (e) => {
			const { content } = /** @type {CustomEvent} */ (e).detail;
			this.dispatchEvent(
				new CustomEvent('send-message', {
					detail: { content, conversationId: this.#conversationId },
					bubbles: true,
				}),
			);
		});

		// Main chat area
		const main = document.createElement('div');
		main.className = 'chat-main';
		main.append(this.#msgList, this.#emptyState, this.#composeEl);

		// Layout wrapper
		const layout = document.createElement('div');
		layout.className = `chat-layout ${sidebar ? 'chat-layout--with-sidebar' : ''}`;
		if (sidebar) {
			layout.append(sidebar);
		}
		layout.append(main);

		this.append(header, layout);

		// Disable compose for owner until they select a conversation
		if (this.#user?.isOwner && !this.#conversationId) {
			this.#composeEl.disable();
		}
	}

	/** @param {Array<{ id: string, display_name: string, last_message: string | null }>} conversations */
	#buildSidebar(conversations) {
		const sidebar = document.createElement('nav');
		sidebar.className = 'chat-sidebar';
		sidebar.setAttribute('aria-label', 'Conversations');

		const h2 = document.createElement('h2');
		h2.className = 'chat-sidebar__title';
		h2.textContent = 'Conversations';
		sidebar.append(h2);

		this.#convList = document.createElement('ul');
		this.#convList.className = 'conv-list';
		this.#fillConversations(conversations);
		sidebar.append(this.#convList);
		return sidebar;
	}

	/** @type {HTMLUListElement | null} */
	#convList = null;
	/** @type {HTMLDivElement} */
	#msgList = /** @type {any} */ (null);
	/** @type {HTMLParagraphElement} */
	#emptyState = /** @type {any} */ (null);
	/** @type {import('./message-input.js').MessageInput} */
	#composeEl = /** @type {any} */ (null);
	/** @type {HTMLButtonElement} */
	#notifBtn = /** @type {any} */ (null);

	/** @param {Array<{ id: string, display_name: string, last_message: string | null }>} conversations */
	#fillConversations(conversations) {
		if (!this.#convList) {
			return;
		}
		this.#convList.innerHTML = '';
		for (const conv of conversations) {
			const li = document.createElement('li');
			li.className = 'conv-item';
			const btn = document.createElement('button');
			btn.type = 'button';
			btn.className = `conv-item__btn ${conv.id === this.#conversationId ? 'conv-item__btn--active' : ''}`;
			const name = document.createElement('span');
			name.className = 'conv-item__name';
			name.textContent = conv.display_name;
			const preview = document.createElement('span');
			preview.className = 'conv-item__preview';
			preview.textContent = conv.last_message ?? 'No messages yet';
			btn.append(name, preview);
			btn.addEventListener('click', () => {
				this.#conversationId = conv.id;
				this.#composeEl.enable();
				// Update active state
				this.#convList?.querySelectorAll('.conv-item__btn').forEach((b) => {
					b.classList.remove('conv-item__btn--active');
				});
				btn.classList.add('conv-item__btn--active');
				this.dispatchEvent(
					new CustomEvent('conversation-select', {
						detail: { conversationId: conv.id },
						bubbles: true,
					}),
				);
			});
			li.append(btn);
			this.#convList.append(li);
		}
	}

	/** @param {Array<{ id: string, display_name: string, last_message: string | null }>} conversations */
	setConversations(conversations) {
		this.#fillConversations(conversations);
	}

	/**
	 * @param {Array<{ id: string, sender_user_id: string, content: string, createdAt: string }>} messages
	 */
	#renderMessages(messages) {
		this.#msgList.innerHTML = '';
		for (const msg of messages) {
			this.#appendBubble(msg);
		}
		this.#emptyState.hidden = messages.length > 0;
		this.#scrollToBottom();
	}

	/**
	 * @param {{ id: string, sender_user_id: string, content: string, createdAt: string }} msg
	 */
	#appendBubble(msg) {
		const sentByMe = this.#user?.isOwner
			? msg.sender_user_id === this.#user?.id // owner's own messages
			: msg.sender_user_id === this.#user?.id; // visitor's own messages

		const bubble = /** @type {import('./message-bubble.js').MessageBubble} */ (
			document.createElement('message-bubble')
		);
		bubble.dataset.msgId = msg.id;
		const senderName = !sentByMe && !this.#user?.isOwner ? this.#ownerName : undefined;
		bubble.setData({ content: msg.content, sentByMe, senderName, timestamp: msg.createdAt });
		this.#msgList.append(bubble);
	}

	/**
	 * Append a new message with a view transition.
	 * @param {{ id: string, sender_user_id: string, content: string, createdAt: string }} msg
	 */
	addMessage(msg) {
		this.#emptyState.hidden = true;
		const append = () => {
			this.#appendBubble(msg);
			this.#scrollToBottom();
		};
		if ('startViewTransition' in document) {
			document.startViewTransition(append);
		} else {
			append();
		}
	}

	/**
	 * Replace the entire message list (after polling).
	 * @param {Array<{ id: string, sender_user_id: string, content: string, createdAt: string }>} messages
	 */
	setMessages(messages) {
		const currentCount = this.#msgList.children.length;
		if (messages.length > currentCount) {
			// New messages arrived
			const newMsgs = messages.slice(currentCount);
			for (const msg of newMsgs) {
				this.addMessage(msg);
			}
		}
	}

	#scrollToBottom() {
		this.#msgList.scrollTop = this.#msgList.scrollHeight;
	}

	#checkNotificationStatus() {
		if (!('Notification' in window)) {
			this.#notifBtn?.remove();
			return;
		}
		if (Notification.permission === 'granted') {
			if (this.#notifBtn) {
				this.#notifBtn.textContent = '🔕';
				this.#notifBtn.setAttribute('aria-label', 'Notifications enabled');
				this.#notifBtn.title = 'Notifications enabled';
			}
		}
	}

	markNotificationsEnabled() {
		if (this.#notifBtn) {
			this.#notifBtn.textContent = '🔕';
			this.#notifBtn.setAttribute('aria-label', 'Notifications enabled');
		}
	}
}

customElements.define('chat-view', ChatView);
