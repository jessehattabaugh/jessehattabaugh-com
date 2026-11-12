import { highlightCode } from '../../../shared/code-highlight.js';

/** Highlight client-created examples with the same renderer as the templates. */
export class CodeBlock extends HTMLElement {
	static observedAttributes = ['language'];

	connectedCallback() {
		this.#render();
	}

	attributeChangedCallback() {
		if (this.isConnected) { this.#render(); }
	}

	#render() {
		const language = this.getAttribute('language') ?? 'html';
		if (this.dataset.highlighted === language) { return; }
		const code = this.querySelector('pre > code');
		if (!code) { return; }
		const source = code.textContent ?? '';
		const highlighted = highlightCode(source, language);
		if (highlighted === undefined) { code.textContent = source; }
		else { code.innerHTML = highlighted; }
		this.dataset.highlighted = language;
	}
}
