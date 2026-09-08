import './message-bubble.js';
import './message-input.js';

const layoutTemplate = document.createElement('template');
layoutTemplate.innerHTML = `
	<header class="chat-header">
		<button
			type="button"
			class="btn btn--ghost chat-header__sidebar-toggle"
			aria-label="Open conversations sidebar"
			aria-expanded="false"
			aria-haspopup="dialog"
		>
			<svg
				class="chat-header__sidebar-icon"
				viewBox="0 0 24 24"
				width="20"
				height="20"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				aria-hidden="true"
			>
				<path d="M4 6h16"></path>
				<path d="M4 12h16"></path>
				<path d="M4 18h16"></path>
			</svg>
			<span class="chat-header__sidebar-label">Conversations</span>
		</button>
		<div class="chat-header__title">
			<h1></h1>
		</div>
		<div class="chat-header__actions">
			<button
				type="button"
				class="btn btn--ghost chat-header__notif"
				aria-label="Enable notifications"
				aria-pressed="false"
				title="Enable notifications"
			>🔕</button>
			<button type="button" class="btn btn--ghost chat-header__logout">Sign out</button>
		</div>
	</header>
	<div class="chat-layout">
		<div class="chat-main">
			<div class="chat-messages" role="log" aria-live="polite" aria-label="Messages"></div>
			<p class="chat-empty"></p>
			<message-input></message-input>
		</div>
	</div>
`;

const sidebarTemplate = document.createElement('template');
sidebarTemplate.innerHTML = `
	<dialog class="chat-sidebar-dialog" aria-labelledby="chat-sidebar-title">
		<nav class="chat-sidebar" aria-label="Conversations">
			<div class="chat-sidebar__header">
				<h2 id="chat-sidebar-title" class="chat-sidebar__title">Conversations</h2>
				<button
					type="button"
					class="chat-sidebar__close"
					aria-label="Close conversations"
				>✕</button>
			</div>
			<ul class="conv-list"></ul>
		</nav>
	</dialog>
`;

const convItemTemplate = document.createElement('template');
convItemTemplate.innerHTML = `
	<li class="conv-item">
		<button type="button" class="conv-item__btn">
			<span class="conv-item__name"></span>
			<span class="conv-item__preview"></span>
		</button>
	</li>
`;

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
		this.replaceChildren();
		this.#buildLayout(conversations);
		this.#renderMessages(messages);
		this.#checkNotificationStatus();
	}

	/** @param {Array<{ id: string, visitor_user_id: string, display_name: string, last_message: string | null }>} conversations */
	#buildLayout(conversations) {
		this.append(layoutTemplate.content.cloneNode(true));

		/** @type {HTMLHeadingElement} */ (
			this.querySelector('.chat-header__title h1')
		).textContent = this.#user?.isOwner ? 'Messages' : this.#ownerName;

		this.#sidebarToggle = /** @type {HTMLButtonElement | null} */ (
			this.querySelector('.chat-header__sidebar-toggle')
		);
		this.#sidebarToggle?.addEventListener('click', () => {
			const dialog = this.#sidebarDialog;
			if (!dialog) {
				return;
			}
			if (window.matchMedia('(min-width: 640px)').matches) {
				// On desktop the sidebar is always visible inline; nothing to toggle.
				return;
			}
			if (dialog.open) {
				dialog.close();
			} else {
				dialog.showModal();
				this.#syncSidebarToggle();
			}
		});
		this.#sidebarToggle && (this.#sidebarToggle.style.display = this.#user?.isOwner ? '' : 'none');

		this.#notifBtn = /** @type {HTMLButtonElement} */ (
			this.querySelector('.chat-header__notif')
		);
		this.#notifBtn.addEventListener('click', () => {
			const enabled = this.#notifBtn?.getAttribute('aria-pressed') === 'true';
			this.dispatchEvent(
				new CustomEvent(enabled ? 'push-unsubscribe' : 'push-subscribe', { bubbles: true }),
			);
		});

		this.querySelector('.chat-header__logout')?.addEventListener('click', () => {
			this.dispatchEvent(new CustomEvent('logout', { bubbles: true }));
		});

		this.#msgList = /** @type {HTMLDivElement} */ (this.querySelector('.chat-messages'));

		this.#emptyState = /** @type {HTMLParagraphElement} */ (this.querySelector('.chat-empty'));
		this.#emptyState.textContent = this.#user?.isOwner
			? 'Select a conversation to view messages.'
			: `No messages yet. Say hello to ${this.#ownerName}!`;

		this.#composeEl = /** @type {import('./message-input.js').MessageInput} */ (
			this.querySelector('message-input')
		);
		this.#composeEl.addEventListener('send-message', (e) => {
			// Stop the original bubbling here — we re-dispatch below with
			// conversationId attached, and letting both reach listeners above
			// chat-view would send every message twice.
			e.stopPropagation();
			const { content } = /** @type {CustomEvent} */ (e).detail;
			this.dispatchEvent(
				new CustomEvent('send-message', {
					detail: { content, conversationId: this.#conversationId },
					bubbles: true,
				}),
			);
		});

		if (this.#user?.isOwner && conversations.length > 0) {
			const layout = /** @type {HTMLDivElement} */ (this.querySelector('.chat-layout'));
			const frag = /** @type {DocumentFragment} */ (sidebarTemplate.content.cloneNode(true));
			/** @type {HTMLDialogElement} */
			const dialog = /** @type {HTMLDialogElement} */ (frag.querySelector('dialog'));
			layout.prepend(frag);
			this.#sidebarDialog = dialog;
			this.#convList = dialog.querySelector('.conv-list');
			this.#fillConversations(conversations);

			dialog.addEventListener('close', () => {
				this.#syncSidebarToggle();
			});
			dialog.querySelector('.chat-sidebar__close')?.addEventListener('click', () => {
				dialog.close();
			});

			// Collapse the modal back into the static sidebar when the screen
			// is rotated wide enough for the inline layout.
			const wideScreen = window.matchMedia('(min-width: 640px)');
			wideScreen.addEventListener('change', (e) => {
				if (e.matches && dialog.open) {
					dialog.close();
				}
			});
		}

		// Disable compose for owner until they select a conversation
		if (this.#user?.isOwner && !this.#conversationId) {
			this.#composeEl.disable();
		}
	}

	/** @type {HTMLUListElement | null} */
	#convList = null;
	/** @type {HTMLDivElement} */
	#msgList = /** @type {any} */ (null);
	/** @type {HTMLParagraphElement} */
	#emptyState = /** @type {any} */ (null);
	/** @type {import('./message-input.js').MessageInput} */
	#composeEl = /** @type {any} */ (null);
	/** @type {HTMLButtonElement | null} */
	#sidebarToggle = null;
	/** @type {HTMLDialogElement | null} */
	#sidebarDialog = null;
	/** @type {HTMLButtonElement} */
	#notifBtn = /** @type {any} */ (null);

	#syncSidebarToggle() {
		const toggle = this.#sidebarToggle;
		if (!toggle) {
			return;
		}
		const isOpen = Boolean(this.#sidebarDialog?.open);
		toggle.setAttribute('aria-expanded', String(isOpen));
		toggle.setAttribute(
			'aria-label',
			isOpen ? 'Close conversations sidebar' : 'Open conversations sidebar',
		);
	}

	/** @param {Array<{ id: string, display_name: string, last_message: string | null }>} conversations */
	#fillConversations(conversations) {
		if (!this.#convList) {
			return;
		}
		this.#convList.replaceChildren();
		for (const conv of conversations) {
			const item = /** @type {DocumentFragment} */ (convItemTemplate.content.cloneNode(true));
			const btn = /** @type {HTMLButtonElement} */ (item.querySelector('.conv-item__btn'));
			btn.classList.toggle('conv-item__btn--active', conv.id === this.#conversationId);
			btn.setAttribute('aria-label', `Select conversation with ${conv.display_name}`);
			/** @type {HTMLSpanElement} */ (item.querySelector('.conv-item__name')).textContent =
				conv.display_name;
			/** @type {HTMLSpanElement} */ (item.querySelector('.conv-item__preview')).textContent =
				conv.last_message ?? 'No messages yet';
			btn.addEventListener('click', () => {
				this.#conversationId = conv.id;
				this.#composeEl.enable();
				// Update active state
				this.#convList?.querySelectorAll('.conv-item__btn').forEach((b) => {
					b.classList.remove('conv-item__btn--active');
				});
btn.classList.add('conv-item__btn--active');
				this.#sidebarDialog?.close();
				this.dispatchEvent(
					new CustomEvent('conversation-select', {
						detail: { conversationId: conv.id },
						bubbles: true,
					}),
				);
			});
			this.#convList.append(item);
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
		this.#msgList.replaceChildren();
		for (const msg of messages) {
			this.#appendBubble(msg);
		}
		this.#emptyState.hidden = messages.length > 0;
		this.#scrollToBottom();
	}

	/**
	 * @param {{ id: string, sender_user_id: string, content: string, createdAt: string }} msg
	 * @param {boolean} [isNew]
	 * @returns {import('./message-bubble.js').MessageBubble}
	 */
	#appendBubble(msg, isNew = false) {
		const sentByMe = msg.sender_user_id === this.#user?.id;

		const bubble = /** @type {import('./message-bubble.js').MessageBubble} */ (
			document.createElement('message-bubble')
		);
		if (!isNew) {
			bubble.dataset.msgId = msg.id;
		}
		const senderName = !sentByMe && !this.#user?.isOwner ? this.#ownerName : undefined;
		bubble.setData({ content: msg.content, sentByMe, senderName, timestamp: msg.createdAt });
		this.#msgList.append(bubble);
		return bubble;
	}

	/**
	 * Append a new message with a view transition.
	 * @param {{ id: string, sender_user_id: string, content: string, createdAt: string }} msg
	 */
	addMessage(msg) {
		this.#emptyState.hidden = true;

		/** @type {import('./message-bubble.js').MessageBubble | null} */
		let newBubble = null;

		const append = () => {
			newBubble = this.#appendBubble(msg, true);
			this.#scrollToBottom();
		};

		const finalize = () => {
			const bubble = /** @type {import('./message-bubble.js').MessageBubble | null} */ (
				newBubble
			);
			if (bubble) {
				bubble.dataset.msgId = msg.id;
				bubble.style.viewTransitionName = `msg-${msg.id}`;
			}
		};

		if ('startViewTransition' in document) {
			const transition = document.startViewTransition(append);
			transition.finished.then(finalize).catch(() => {
				// Ignore view transition failures.
			});
		} else {
			append();
			finalize();
		}
	}

	/**
	 * Replace the entire message list (after polling).
	 * @param {Array<{ id: string, sender_user_id: string, content: string, createdAt: string }>} messages
	 */
	setMessages(messages) {
		this.#renderMessages(messages);
	}

	#scrollToBottom() {
		this.#msgList.scrollTop = this.#msgList.scrollHeight;
	}

	async #checkNotificationStatus() {
		if (!('Notification' in window)) {
			this.#notifBtn?.remove();
			return;
		}
		if (Notification.permission !== 'granted') {
			return;
		}
		try {
			if ('serviceWorker' in navigator && 'PushManager' in window) {
				const reg = await navigator.serviceWorker.ready;
				const existing = await reg.pushManager.getSubscription();
				if (existing) {
					this.markNotificationsEnabled();
				}
			}
		} catch {
			// Ignore failures — leave the button in its default (disabled) state.
		}
	}

	markNotificationsEnabled() {
		if (this.#notifBtn) {
			this.#notifBtn.setAttribute('aria-pressed', 'true');
			this.#notifBtn.setAttribute('aria-label', 'Notifications enabled');
			this.#notifBtn.title = 'Notifications enabled';
			this.#notifBtn.textContent = '🔔';
		}
	}

	markNotificationsDisabled() {
		if (this.#notifBtn) {
			this.#notifBtn.setAttribute('aria-pressed', 'false');
			this.#notifBtn.setAttribute('aria-label', 'Enable notifications');
			this.#notifBtn.title = 'Enable notifications';
			this.#notifBtn.textContent = '🔕';
		}
	}
}

customElements.define('chat-view', ChatView);
