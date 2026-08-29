/**
 * <messages-app> — Root orchestrator for the Messages PWA.
 *
 * State machine:  loading → auth | chat
 * Handles: service worker, polling, push subscriptions, view transitions.
 */
import { api } from './api.js';
import './components/install-prompt.js';
import './components/auth-screen.js';
import './components/chat-view.js';

const POLL_INTERVAL = 5000;

class MessagesApp extends HTMLElement {
	/** @type {{ id: string, displayName: string, isOwner: boolean } | null} */
	#user = null;
	/** @type {string | null} */
	#conversationId = null;
	/** @type {ReturnType<typeof setInterval> | null} */
	#pollTimer = null;

	async connectedCallback() {
		document.getElementById('ssr-fallback')?.remove();
		this.#showLoading();
		this.#registerSW();
		await this.#init();
	}

	disconnectedCallback() {
		if (this.#pollTimer) {
			clearInterval(this.#pollTimer);
		}
	}

	// ── Service worker ────────────────────────────────────────────────────────

	#registerSW() {
		if (!('serviceWorker' in navigator)) {
			return;
		}
		navigator.serviceWorker
			.register('/apps/messages/sw.js', { scope: '/apps/messages/' })
			.catch((e) => {
				console.warn('SW registration failed', e);
			});

		// Listen for push events relayed from SW
		navigator.serviceWorker.addEventListener('message', (e) => {
			if (e.data?.type === 'PUSH_RECEIVED') {
				this.#poll();
			}
		});
	}

	// ── Init ─────────────────────────────────────────────────────────────────

	async #init() {
		try {
			const { user } = await api.getMe();
			if (!user) {
				this.#showAuth();
			} else {
				this.#user = user;
				await this.#showChat();
			}
		} catch {
			this.#showAuth();
		}
	}

	// ── Views ─────────────────────────────────────────────────────────────────

	#showLoading() {
		this.innerHTML = `<div class="app-loading" aria-label="Loading" role="status">
      <div class="app-loading__spinner" aria-hidden="true"></div>
      <p>Loading…</p>
    </div>`;
	}

	#showAuth() {
		const transition = () => {
			this.innerHTML = '';
			const prompt = document.createElement('install-prompt');
			const screen = document.createElement('auth-screen');
			screen.addEventListener('auth-success', (e) => {
				const { user } = /** @type {CustomEvent} */ (e).detail;
				this.#user = user;
				this.#showChat().catch(console.error);
			});
			this.append(prompt, screen);
		};

		if ('startViewTransition' in document) {
			document.startViewTransition(transition);
		} else {
			transition();
		}
	}

	async #showChat() {
		if (!this.#user) {
			this.#showAuth();
			return;
		}
		const user = this.#user;

		let chatData;
		try {
			chatData = await api.getMessages(this.#conversationId ?? undefined);
		} catch {
			chatData = {
				messages: [],
				conversations: [],
				conversationId: null,
				ownerName: 'Jesse',
			};
		}

		this.#conversationId = chatData.conversationId ?? null;

		const transition = () => {
			this.innerHTML = '';

			const prompt = document.createElement('install-prompt');

			/** @type {import('./components/chat-view.js').ChatView} */
			const chat = /** @type {any} */ (document.createElement('chat-view'));

			// Attach the chat view to the document *before* calling init(). Custom
			// elements nested in chat-view's template (e.g. <message-input>) are only
			// upgraded — and their connectedCallback run — once the tree is connected
			// to the document. init() calls composeEl.disable()/enable(), which would
			// otherwise throw on the still-unupgraded element and leave a blank screen.
			this.append(prompt, chat);

			chat.init({
				user,
				messages: chatData.messages ?? [],
				conversationId: chatData.conversationId ?? null,
				conversations: chatData.conversations ?? [],
				ownerName: chatData.ownerName ?? 'Jesse',
			});

			// Wire up chat events
			chat.addEventListener('send-message', (e) => {
				const { content, conversationId } = /** @type {CustomEvent} */ (e).detail;
				this.#sendMessage(content, conversationId, chat).catch(console.error);
			});

			chat.addEventListener('conversation-select', (e) => {
				const { conversationId } = /** @type {CustomEvent} */ (e).detail;
				this.#conversationId = conversationId;
				this.#loadConversation(conversationId, chat).catch(console.error);
			});

			chat.addEventListener('push-subscribe', () => {
				this.#setupPush(chat).catch(console.error);
			});

			chat.addEventListener('push-unsubscribe', () => {
				this.#teardownPush(chat).catch(console.error);
			});

			chat.addEventListener('logout', () => {
				this.#logout().catch(console.error);
			});
		};

		if ('startViewTransition' in document) {
			document.startViewTransition(transition);
		} else {
			transition();
		}

		// Start polling for new messages
		this.#startPolling();
	}

	// ── Message actions ───────────────────────────────────────────────────────

	/**
	 * @param {string} content
	 * @param {string | null} conversationId
	 * @param {import('./components/chat-view.js').ChatView} chat
	 */
	async #sendMessage(content, conversationId, chat) {
		try {
			const msg = await api.sendMessage({
				content,
				conversationId: conversationId ?? undefined,
			});
			chat.addMessage(msg);
		} catch (e) {
			console.error('Send failed', e);
		}
	}

	/**
	 * @param {string} conversationId
	 * @param {import('./components/chat-view.js').ChatView} chat
	 */
	async #loadConversation(conversationId, chat) {
		try {
			const data = await api.getMessages(conversationId);
			chat.setMessages(data.messages ?? []);
			if (data.conversations) {
				chat.setConversations(data.conversations);
			}
		} catch (e) {
			console.error('Failed to load conversation', e);
		}
	}

	// ── Polling ───────────────────────────────────────────────────────────────

	#startPolling() {
		if (this.#pollTimer) {
			clearInterval(this.#pollTimer);
		}
		this.#pollTimer = setInterval(() => {
			this.#poll();
		}, POLL_INTERVAL);
	}

	async #poll() {
		const chat = this.querySelector('chat-view');
		if (!chat || !this.#user) {
			return;
		}
		try {
			const data = await api.getMessages(this.#conversationId ?? undefined);
			/** @type {import('./components/chat-view.js').ChatView} */ (chat).setMessages(
				data.messages ?? [],
			);
		} catch {
			// Ignore polling failures and retry on the next interval.
		}
	}

	// ── Push notifications ────────────────────────────────────────────────────

	/** @param {import('./components/chat-view.js').ChatView} chat */
	async #setupPush(chat) {
		if (
			!('PushManager' in window) ||
			!('serviceWorker' in navigator) ||
			!('Notification' in window)
		) {
			return;
		}

		let permission;
		try {
			permission = await Notification.requestPermission();
		} catch {
			return;
		}
		if (permission !== 'granted') {
			return;
		}

		const { vapidPublicKey } = await api.getConfig();
		if (!vapidPublicKey) {
			return; // VAPID not configured
		}

		const reg = await navigator.serviceWorker.ready;
		const existing = await reg.pushManager.getSubscription();
		if (existing) {
			await api.subscribePush(existing);
			chat.markNotificationsEnabled();
			return;
		}

		const applicationServerKey = this.#urlBase64ToUint8Array(vapidPublicKey);
		const subscription = await reg.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey,
		});
		await api.subscribePush(subscription);
		chat.markNotificationsEnabled();
	}

	/** @param {import('./components/chat-view.js').ChatView} chat */
	async #teardownPush(chat) {
		if (!('serviceWorker' in navigator)) {
			return;
		}
		try {
			const reg = await navigator.serviceWorker.ready;
			const existing = await reg.pushManager.getSubscription();
			if (existing) {
				await existing.unsubscribe();
				await api.unsubscribePush(existing.endpoint);
			}
		} catch {
			// Ignore teardown failures.
		}
		chat.markNotificationsDisabled();
	}

	/**
	 * Convert VAPID public key (base64url uncompressed P-256) to Uint8Array for PushManager.
	 * @param {string} b64url
	 */
	#urlBase64ToUint8Array(b64url) {
		const padded =
			b64url.replace(/-/g, '+').replace(/_/g, '/') +
			'='.repeat((4 - (b64url.length % 4)) % 4);
		const binary = atob(padded);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) {
			bytes[i] = binary.charCodeAt(i);
		}
		return bytes;
	}

	// ── Logout ────────────────────────────────────────────────────────────────

	async #logout() {
		if (this.#pollTimer) {
			clearInterval(this.#pollTimer);
		}
		await api.logout();
		this.#user = null;
		this.#conversationId = null;
		this.#showAuth();
	}
}

customElements.define('messages-app', MessagesApp);
