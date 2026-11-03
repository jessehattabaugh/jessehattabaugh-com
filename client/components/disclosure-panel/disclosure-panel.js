/**
 * A light-DOM enhancement of one direct <details> child.
 * Attributes carry state down; disclosure-change reports state up.
 * Keep <summary> and content in HTML so the disclosure works before upgrade.
 */
export class DisclosurePanel extends HTMLElement {
	static observedAttributes = ['open'];
	/** @type {HTMLDetailsElement | null} */
	#details = null;
	#open = false;
	#observer = new MutationObserver(() => { this.#connectDetails(); });

	connectedCallback() {
		this.#connectDetails();
		// Also supports registration before the parser reaches the children.
		this.#observer.observe(this, { childList: true });
		this.addEventListener('disclosure-request', this.#request);
	}

	disconnectedCallback() {
		this.#observer.disconnect();
		this.#details?.removeEventListener('toggle', this.#toggle);
		this.#details = null;
		this.removeEventListener('disclosure-request', this.#request);
	}

	#connectDetails() {
		const details = Array.from(this.children).find((child) => { return child instanceof HTMLDetailsElement; });
		if (details === this.#details) { return; }
		this.#details?.removeEventListener('toggle', this.#toggle);
		if (!(details instanceof HTMLDetailsElement)) { this.#details = null; return; }
		this.#details = details;
		// Host state wins at upgrade; otherwise adopt the native fallback state.
		if (this.hasAttribute('open')) { details.open = true; }
		this.#open = details.open;
		this.toggleAttribute('open', details.open);
		details.addEventListener('toggle', this.#toggle);
	}

	attributeChangedCallback() {
		if (!this.#details) { return; }
		this.#details.open = this.hasAttribute('open');
		this.#report();
	}

	#toggle = () => {
		if (!this.#details) { return; }
		this.toggleAttribute('open', this.#details.open);
		this.#report();
	};

	#report() {
		if (!this.#details || this.#open === this.#details.open) { return; }
		this.#open = this.#details.open;
		this.dispatchEvent(new CustomEvent('disclosure-change', {
			detail: { open: this.#open }, bubbles: true, composed: true,
		}));
	}

	/** @param {Event} event */
	#request = (event) => {
		// Nested panels own their own requests, even across shadow boundaries.
		const owner = event.composedPath().find((node) => { return node instanceof DisclosurePanel; });
		if (owner !== this || event.defaultPrevented || !(event instanceof CustomEvent)
			|| typeof event.detail?.open !== 'boolean' || !this.#details) { return; }
		// Native toggle delivery is deferred; a request can arrive before the host
		// attribute has reflected a summary click. Always update the native state.
		this.#details.open = event.detail.open;
		this.toggleAttribute('open', event.detail.open);
		this.#report();
	};
}
