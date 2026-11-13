import { highlightCode } from '../../../shared/code-highlight.js';

/**
 * Highlights the source text in a native pre and code pair. Place source in a direct pre containing a code element before connection. Changing language recolors the current source.
 * @attr {string} [language=html] - Highlight.js grammar. Supports HTML, CSS, JavaScript and Bash. Unknown languages display as plain text.
 * @cssprop [--space-md=1rem] - Padding around the source.
 * @cssprop [--color-border=#526079] - Border color of the source panel.
 * @cssprop [--radius=.5rem] - Corner radius of the source panel.
 */
export class CodeBlock extends HTMLElement {
	/** @internal */
	static observedAttributes = ['language'];

	/** @internal */
	connectedCallback() {
		this.#render();
	}

	/** @internal */
	attributeChangedCallback() {
		if (this.isConnected) {
			this.#render();
		}
	}

	#render() {
		const language = this.getAttribute('language') ?? 'html';
		if (this.dataset.highlighted === language) {
			return;
		}
		const code = this.querySelector('pre > code');
		if (!code) {
			return;
		}
		const source = code.textContent ?? '';
		const highlighted = highlightCode(source, language);
		if (highlighted === undefined) {
			code.textContent = source;
		} else {
			code.innerHTML = highlighted;
		}
		this.dataset.highlighted = language;
	}
}
