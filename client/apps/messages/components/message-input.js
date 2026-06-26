const template = document.createElement('template');
template.innerHTML = `
	<textarea
		class="compose__input"
		placeholder="Message…"
		rows="1"
		aria-label="Message"
		autocomplete="off"
	></textarea>
	<button type="button" class="btn compose__send" aria-label="Send message">
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
	</button>
`;

/**
 * <message-input> — Compose area with send button.
 * Dispatches 'send-message' with { content } on submit.
 * Call .enable() / .disable() to toggle interactivity.
 * Set .draft = "text" to pre-fill (e.g. from Share Target).
 */
export class MessageInput extends HTMLElement {
	connectedCallback() {
		this.append(template.content.cloneNode(true));

		this.#textarea = /** @type {HTMLTextAreaElement} */ (this.querySelector('.compose__input'));
		this.#sendBtn = /** @type {HTMLButtonElement} */ (this.querySelector('.compose__send'));

		// Auto-grow
		this.#textarea.addEventListener('input', () => {
			this.#textarea.style.height = 'auto';
			this.#textarea.style.height = `${this.#textarea.scrollHeight}px`;
		});

		// Send on Enter (Shift+Enter for newline)
		this.#textarea.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				this.#send();
			}
		});

		this.#sendBtn.addEventListener('click', () => {
			this.#send();
		});
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
