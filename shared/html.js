/** Marks a string as already-safe HTML so it is not re-escaped. */
export class Raw {
	/** @param {string} value */
	constructor(value) {
		this.value = value;
	}
}

/** @param {string} s */
function escapeHtml(s) {
	return s.replace(/[&<>"']/g, (c) => {
		return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c;
	});
}

/**
 * Auto-escaping HTML tagged template. Returns a Raw so templates can nest.
 * @param {TemplateStringsArray} strings
 * @param {...(string | number | Raw | Array<string | Raw>)} values
 * @returns {Raw}
 */
export function html(strings, ...values) {
	const [firstChunk = ''] = strings;
	let out = firstChunk;
	for (let i = 0; i < values.length; i++) {
		const v = values[i];
		const arr = Array.isArray(v) ? v : [v];
		out += arr
			.map((x) => {
				return x instanceof Raw ? x.value : escapeHtml(String(x));
			})
			.join('');
		out += strings[i + 1];
	}
	return new Raw(out);
}

/**
 * Render a Raw (or string) to a final HTML string.
 * @param {Raw | string} node
 * @returns {string}
 */
export const render = (node) => {
	return node instanceof Raw ? node.value : escapeHtml(String(node));
};
