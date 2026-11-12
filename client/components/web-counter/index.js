/** Render a supplied count into the native output. Data collection lives with the host site. */
export class WebCounter extends HTMLElement {
	static observedAttributes = ['value', 'leading-zeros'];

	connectedCallback() { this.#update(); }

	attributeChangedCallback() { this.#update(); }

	#update() {
		const raw = this.getAttribute('value');
		if (!raw || !/^\d+$/.test(raw)) { return; }
		const count = Number(raw);
		const output = this.querySelector(':scope > output');
		if (!output || !Number.isSafeInteger(count)) { return; }

		const formatted = count.toLocaleString('en-US');
		const rawPadding = this.getAttribute('leading-zeros');
		const padding = rawPadding !== null && /^\d+$/.test(rawPadding) && Number(rawPadding) <= 16 ? Number(rawPadding) : 1;
		const digits = '0'.repeat(padding) + count;
		if (output.querySelector('[data-count]')?.textContent === formatted
			&& output.querySelector('[data-reels]')?.childElementCount === digits.length) { return; }
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
		output.replaceChildren(text, reels);
	}
}

if (!customElements.get('web-counter')) { customElements.define('web-counter', WebCounter); }
