/** Display syntax-highlighted code without changing the DOM.
 *
 * The visible markup stays a normal `<pre><code>` element, so text selection,
 * find-in-page, copy, and assistive technology all see the original source.
 * On upgrade, tokens are measured with `Range` objects and registered with the
 * CSS Custom Highlight API. Browsers without the API keep the readable,
 * unstyled code (colors are decorative, not required to use the page).
 *
 * Styling hooks are the `::highlight(code-*)` names registered here.
 */

/** @typedef {'punctuation' | 'tag' | 'attribute' | 'value' | 'keyword' | 'string' | 'comment' | 'number'} TokenType */
/** @typedef {{ type: TokenType, start: number, end: number }} Token */
/** @typedef {{ node: Text, start: number, end: number }} Segment */

const tagPattern = /<(\/?)([a-z][\w-]*)(\s+(?:[^"'<>]|"[^"]*"|'[^']*')*)?(\/?>)/gi;
const attributePattern = /([^\s"'<>/=]+)(?:(\s*=\s*)("[^"]*"|'[^']*'|[^\s"'=<>`]+))?/g;
const scriptPattern = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(const|let|var|function|return|if|else|for|of|in|while|new|class|extends|import|export|from|await|async|try|catch|finally|throw|typeof|instanceof|delete|void|yield|switch|case|break|continue|default|do|this|super|static|get|set)\b|\b\d+(?:\.\d+)?\b/g;
const shellPattern = /(#[^\n]*)|("(?:[^"\\]|\\.)*"|'[^']*')|(?<![\w-])(--?[a-z][\w-]*)/gi;

/** @param {string} source @returns {Token[]} */
function htmlTokens(source) {
	/** @type {Token[]} */
	const tokens = [];
	for (const match of source.matchAll(tagPattern)) {
		const [tag, slash, name = '', attributes = '', closing = '>'] = match;
		const tagStart = match.index ?? 0;
		const nameStart = tagStart + 1 + slash.length;
		tokens.push({ type: 'punctuation', start: tagStart, end: nameStart });
		tokens.push({ type: 'tag', start: nameStart, end: nameStart + name.length });
		const attributesStart = nameStart + name.length;
		for (const attribute of attributes.matchAll(attributePattern)) {
			const [whole, attributeName, equals, value] = attribute;
			if (!attributeName) { continue; }
			const attributeStart = attributesStart + (attribute.index ?? 0);
			tokens.push({ type: 'attribute', start: attributeStart, end: attributeStart + attributeName.length });
			if (!equals || !value) { continue; }
			const equalsStart = attributeStart + attributeName.length;
			tokens.push({ type: 'punctuation', start: equalsStart, end: equalsStart + equals.length });
			const valueStart = attributeStart + whole.length - value.length;
			tokens.push({ type: 'value', start: valueStart, end: valueStart + value.length });
		}
		const closingStart = tagStart + tag.length - closing.length;
		tokens.push({ type: 'punctuation', start: closingStart, end: tagStart + tag.length });
	}
	return tokens;
}

/** @param {string} source @returns {Token[]} */
function scriptTokens(source) {
	/** @type {Token[]} */
	const tokens = [];
	for (const match of source.matchAll(scriptPattern)) {
		/** @type {TokenType} */
		let type;
		if (match[1]) { type = 'comment'; }
		else if (match[2]) { type = 'string'; }
		else if (match[3]) { type = 'keyword'; }
		else { type = 'number'; }
		const start = match.index ?? 0;
		tokens.push({ type, start, end: start + match[0].length });
	}
	return tokens;
}

/** @param {string} source @returns {Token[]} */
function shellTokens(source) {
	/** @type {Token[]} */
	const tokens = [];
	for (const match of source.matchAll(shellPattern)) {
		/** @type {TokenType} */
		let type;
		if (match[1]) { type = 'comment'; }
		else if (match[2]) { type = 'string'; }
		else { type = 'attribute'; }
		const start = match.index ?? 0;
		tokens.push({ type, start, end: start + match[0].length });
	}
	return tokens;
}

/** @type {Record<string, (source: string) => Token[]>} */
const tokenizers = {
	html: htmlTokens,
	markup: htmlTokens,
	javascript: scriptTokens,
	js: scriptTokens,
	shell: shellTokens,
	sh: shellTokens,
};

/** Highlight names are shared by every code block on the page. */
/** @type {Map<TokenType, Highlight>} */
const highlights = new Map();
/** @type {IntersectionObserver | undefined} */
let observer;
/** @type {WeakMap<Element, () => void>} */
const pending = new WeakMap();

/** @param {Element} element @param {() => void} run */
function whenVisible(element, run) {
	pending.set(element, run);
	if (!observer) {
		observer = new IntersectionObserver((entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) { continue; }
				const callback = pending.get(entry.target);
				if (!callback) { continue; }
				pending.delete(entry.target);
				observer?.unobserve(entry.target);
				callback();
			}
		}, { rootMargin: '400px' });
	}
	observer.observe(element);
}

/** @param {() => void} run */
function whenIdle(run) {
	if ('requestIdleCallback' in window) { requestIdleCallback(run, { timeout: 1000 }); }
	else { setTimeout(run, 0); }
}

/** @param {TokenType} type */
function highlight(type) {
	let group = highlights.get(type);
	if (!group) {
		group = new Highlight();
		highlights.set(type, group);
		CSS.highlights.set(`code-${type}`, group);
	}
	return group;
}

/** @param {Node} root @returns {Segment[]} */
function segments(root) {
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	const found = [];
	let offset = 0;
	for (let node = walker.nextNode(); node; node = walker.nextNode()) {
		const text = /** @type {Text} */ (node);
		found.push({ node: text, start: offset, end: offset + text.data.length });
		offset += text.data.length;
	}
	return found;
}

/** @param {Segment[]} parts @param {number} offset */
function segmentAt(parts, offset) {
	return parts.find((part) => { return offset >= part.start && offset <= part.end; });
}

/** @param {Segment[]} parts @param {number} start @param {number} end @returns {Range | undefined} */
function range(parts, start, end) {
	const from = segmentAt(parts, start);
	const to = segmentAt(parts, end);
	if (!from || !to) { return undefined; }
	const created = new Range();
	created.setStart(from.node, start - from.start);
	created.setEnd(to.node, end - to.start);
	return created;
}

export class CodeBlock extends HTMLElement {
	static observedAttributes = ['language'];
	/** @type {{ group: Highlight, range: Range }[]} */
	#registered = [];
	#highlighted = false;

	connectedCallback() {
		if (!('highlights' in CSS) || typeof Highlight !== 'function') { return; }
		whenVisible(this, () => { whenIdle(() => { this.#highlight(); }); });
	}

	disconnectedCallback() {
		pending.delete(this);
		observer?.unobserve(this);
		this.#clear();
	}

	/** @param {string} _name @param {string | null} before @param {string | null} after */
	attributeChangedCallback(_name, before, after) {
		if (before === after) { return; }
		this.#clear();
		if (this.isConnected) { whenVisible(this, () => { whenIdle(() => { this.#highlight(); }); }); }
	}

	#clear() {
		for (const { group, range: tokenRange } of this.#registered) { group.delete(tokenRange); }
		this.#registered = [];
		this.#highlighted = false;
	}

	#highlight() {
		if (this.#highlighted || !this.isConnected) { return; }
		const code = this.querySelector('pre > code') ?? this.querySelector('code');
		if (!code) { return; }
		const source = code.textContent ?? '';
		const language = (this.getAttribute('language') ?? 'html').toLowerCase();
		const tokenize = tokenizers[language];
		const parts = segments(code);
		if (!tokenize || !parts.length) { return; }
		for (const token of tokenize(source)) {
			const tokenRange = range(parts, token.start, token.end);
			if (!tokenRange) { continue; }
			const group = highlight(token.type);
			group.add(tokenRange);
			this.#registered.push({ group, range: tokenRange });
		}
		this.#highlighted = true;
	}
}
