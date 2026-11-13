/**
 * Renders a supplied page view count on rolling digits inside a shadow root.
 * @attr {string} value - A decimal nonnegative safe integer. Starts blank until a valid count is supplied. Invalid updates preserve the displayed count.
 * @attr {string} [leading-zeros=1] - Number of zero wheels before the count, from 0 through 16. An absent or invalid setting uses one.
 * @slot label - Optional visible caption. Defaults to Page views.
 */
export class WebCounter extends HTMLElement {
	/** @internal */
	static observedAttributes = ['value', 'leading-zeros'];
	/** @type {HTMLOutputElement} */
	#output;

	constructor() {
		super();
		const root = this.shadowRoot ?? this.attachShadow({ mode: 'open' });
		const renderedOutput = root.querySelector('output');
		if (renderedOutput) {
			this.#output = renderedOutput;
			return;
		}
		this.#output = document.createElement('output');
		const style = document.createElement('link');
		/** @internal */
		style.rel = 'stylesheet';
		/** @internal */
		style.href = new URL('./styles.css', import.meta.url).href;
		this.#output.setAttribute('aria-label', 'Page views');
		const reels = document.createElement('span');
		/** @internal */
		/** @internal */
		reels.dataset.reels = '';
		reels.setAttribute('aria-hidden', 'true');
		const blank = document.createElement('span');
		/** @internal */
		blank.dataset.empty = '';
		reels.append(blank);
		this.#output.append(reels);
		const label = document.createElement('slot');
		/** @internal */
		label.name = 'label';
		/** @internal */
		label.textContent = 'Page views';
		root.append(style, this.#output, label);
	}

	/** @internal */
	attributeChangedCallback() {
		this.#update();
	}

	#update() {
		const raw = this.getAttribute('value');
		if (!raw || !/^\d+$/.test(raw)) {
			return;
		}
		const count = Number(raw);
		if (!Number.isSafeInteger(count)) {
			return;
		}

		const formatted = count.toLocaleString('en-US');
		const rawPadding = this.getAttribute('leading-zeros');
		const padding =
			rawPadding !== null && /^\d+$/.test(rawPadding) && Number(rawPadding) <= 16
				? Number(rawPadding)
				: 1;
		const digits = '0'.repeat(padding) + count;
		if (
			this.#output.querySelector('[data-count]')?.textContent === formatted &&
			this.#output.querySelector('[data-reels]')?.childElementCount === digits.length
		) {
			return;
		}
		const text = document.createElement('span');
		text.dataset.count = '';
		text.textContent = formatted;
		const reels = document.createElement('span');
		reels.dataset.reels = '';
		reels.setAttribute('aria-hidden', 'true');
		for (const [index, digit] of [...digits].entries()) {
			const wheel = document.createElement('span');
			wheel.style.setProperty('--digit', digit);
			wheel.style.setProperty('--wheel', String(index));
			reels.append(wheel);
		}
		this.#output.replaceChildren(text, reels);
	}
}

if (!customElements.get('web-counter')) {
	customElements.define('web-counter', WebCounter);
}
