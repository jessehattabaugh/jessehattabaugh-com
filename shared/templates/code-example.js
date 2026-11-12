import { html, Raw } from '../html.js';
import { highlightCode } from '../code-highlight.js';

/** Render readable, highlighted source in the first response.
 * @param {{ caption: string, label?: string, language: string, source: string }} example */
export function codeExample({ caption, label = caption, language, source }) {
	const highlighted = highlightCode(source, language);
	const rendered = highlighted === undefined ? source : new Raw(highlighted);
	return html`<figure data-code><figcaption>${caption}</figcaption><code-block language="${language}" data-highlighted="${language}"><pre tabindex="0" aria-label="${label}"><code>${rendered}</code></pre></code-block></figure>`;
}
