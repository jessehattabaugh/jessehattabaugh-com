import { html } from '../../shared/html.js';
/** @import { Raw } from '../../shared/html.js' */

/** Color only syntax. Pass every token through the HTML escaper.
 * @param {string} source */
export function highlightHtml(source) {
	const tagPattern = /<(\/?)([a-z][\w-]*)(\s+(?:[^"'<>]|"[^"]*"|'[^']*')*)?(\/?>)/gi;
	/** @type {(string | Raw)[]} */
	const tokens = [];
	let offset = 0;
	for (const match of source.matchAll(tagPattern)) {
		const [tag, opening, name, attributes = '', closing] = match;
		tokens.push(source.slice(offset, match.index));
		const parts = attributes.split(/("[^"]*"|'[^']*'|[\w:-]+)/g);
		tokens.push(html`<span data-token="punctuation">${`<${opening}`}</span><span data-token="tag">${name}</span>${parts.map((part, index) => {
			if (index % 2 === 0) { return part; }
			return html`<span data-token="${part.startsWith('"') || part.startsWith("'") ? 'value' : 'attribute'}">${part}</span>`;
		})}<span data-token="punctuation">${closing}</span>`);
		offset = match.index + tag.length;
	}
	tokens.push(source.slice(offset));
	return html`${tokens}`;
}
