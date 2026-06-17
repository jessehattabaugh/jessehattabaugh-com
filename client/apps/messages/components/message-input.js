/**
 * <message-input> — Compose area with send button.
 * Dispatches 'send-message' with { content } on submit.
 * Call .enable() / .disable() to toggle interactivity.
 * Set .draft = "text" to pre-fill (e.g. from Share Target).
 */
export class MessageInput extends HTMLElement {
	connectedCallback() {
		this.className = 'compose';

		const textarea = document.createElement('textarea');
		textarea.className = 'compose__input';
		textarea.placeholder = 'Message…';
		textarea.rows = 1;
		textarea.setAttribute('aria-label', 'Message');
		textarea.setAttribute('autocomplete', 'off');

		// Auto-grow
		textarea.addEventListener('input', () => {
			textarea.style.height = 'auto';
			textarea.style.height = `${textarea.scrollHeight}px`;
		});

		// Send on Enter (Shift+Enter for newline)
		textarea.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				this.#send();
			}
		});

		const sendBtn = document.createElement('button');
		sendBtn.type = 'button';
		sendBtn.className = 'btn compose__send';
		sendBtn.setAttribute('aria-label', 'Send message');
		sendBtn.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
		sendBtn.addEventListener('click', () => {
			this.#send();
		});

		this.#textarea = textarea;
		this.#sendBtn = sendBtn;
		this.append(textarea, sendBtn);
	}

	/** @type {HTMLTextAreaElement} */
	#textarea = /** @type {any} */ (null);
	/** @type {HTMLButtonElement} */
	#sendBtn = /** @type {any} */ (null);

	get draft() {
		return this.#textarea?.value ?? '';
	}

	/** @param {string} value */
	set draft(value) {
		if (this.#textarea) {
			this.#textarea.value = value;
			this.#textarea.dispatchEvent(new Event('input'));
			this.#textarea.focus();
		}
	}

	enable() {
		if (this.#textarea) {
			this.#textarea.disabled = false;
		}
		if (this.#sendBtn) {
			this.#sendBtn.disabled = false;
		}
	}

	disable() {
		if (this.#textarea) {
			this.#textarea.disabled = true;
		}
		if (this.#sendBtn) {
			this.#sendBtn.disabled = true;
		}
	}

	#send() {
		const content = this.#textarea?.value.trim();
		if (!content) {
			return;
		}
		this.dispatchEvent(new CustomEvent('send-message', { detail: { content }, bubbles: true }));
		this.#textarea.value = '';
		this.#textarea.style.height = 'auto';
	}
}

customElements.define('message-input', MessageInput);
