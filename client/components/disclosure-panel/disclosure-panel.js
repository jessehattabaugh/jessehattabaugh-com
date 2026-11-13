/**
 * Light-DOM enhancement of one direct details child. Native summary interaction works without JavaScript. No shadow root, slots, CSS parts, dependencies, or network requests. Initial upgrade adopts details.open unless the host open attribute is present; no initial change event. Missing details is inert; direct child insertion is observed. Reconnection adopts current markup without emitting an initial event.
 * @attr {boolean} open - Boolean presence opens the direct details child. Remove to close. open="false" still opens. Native toggles reflect back to this attribute.
 * @fires {CustomEvent<{ open: boolean }>} disclosure-change - Emitted for state changes after initialization, including attribute updates and accepted requests. Bubbles and is composed; not cancelable. Repeated state is silent; native toggle events may coalesce rapid changes.
 * @listens {CustomEvent<{ open: boolean }>} disclosure-request - Dispatch from a descendant to request open or closed state. Requires a boolean detail.open. Invalid, defaultPrevented, missing-child, and outer-panel requests are ignored. Nested panels own their requests. Requests are not stopped and remain observable by ancestors. Set bubbles and composed when dispatching.
 */
export class DisclosurePanel extends HTMLElement {
	/** @internal */
	static observedAttributes = ['open'];
	/** @type {HTMLDetailsElement | null} */
	#details = null;
	#open = false;
	#observer = new MutationObserver(() => {
		this.#connectDetails();
	});

	/** @internal */
	connectedCallback() {
		this.#connectDetails();
		// Also supports registration before the parser reaches the children.
		this.#observer.observe(this, { childList: true });
		this.addEventListener('disclosure-request', this.#request);
	}

	/** @internal */
	disconnectedCallback() {
		this.#observer.disconnect();
		this.#details?.removeEventListener('toggle', this.#toggle);
		this.#details = null;
		this.removeEventListener('disclosure-request', this.#request);
	}

	#connectDetails() {
		const details = Array.from(this.children).find((child) => {
			return child instanceof HTMLDetailsElement;
		});
		if (details === this.#details) {
			return;
		}
		this.#details?.removeEventListener('toggle', this.#toggle);
		if (!(details instanceof HTMLDetailsElement)) {
			this.#details = null;
			return;
		}
		this.#details = details;
		// Host state wins at upgrade; otherwise adopt the native fallback state.
		if (this.hasAttribute('open')) {
			details.open = true;
		}
		this.#open = details.open;
		this.toggleAttribute('open', details.open);
		details.addEventListener('toggle', this.#toggle);
	}

	/** @internal */
	attributeChangedCallback() {
		if (!this.#details) {
			return;
		}
		this.#details.open = this.hasAttribute('open');
		this.#report();
	}

	#toggle = () => {
		if (!this.#details) {
			return;
		}
		this.toggleAttribute('open', this.#details.open);
		this.#report();
	};

	#report() {
		if (!this.#details || this.#open === this.#details.open) {
			return;
		}
		this.#open = this.#details.open;
		this.dispatchEvent(
			new CustomEvent('disclosure-change', {
				detail: { open: this.#open },
				bubbles: true,
				composed: true,
			}),
		);
	}

	/** @param {Event} event */
	#request = (event) => {
		// Nested panels own their own requests, even across shadow boundaries.
		const owner = event.composedPath().find((node) => {
			return node instanceof DisclosurePanel;
		});
		if (
			owner !== this ||
			event.defaultPrevented ||
			!(event instanceof CustomEvent) ||
			typeof event.detail?.open !== 'boolean' ||
			!this.#details
		) {
			return;
		}
		// Native toggle delivery is deferred; a request can arrive before the host
		// attribute has reflected a summary click. Always update the native state.
		this.#details.open = event.detail.open;
		this.toggleAttribute('open', event.detail.open);
		this.#report();
	};
}
