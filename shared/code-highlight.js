/// <reference path="./highlightjs.d.ts" />

import core from '@highlightjs/cdn-assets/es/core.min.js';
import xml from '@highlightjs/cdn-assets/es/languages/xml.min.js';
import css from '@highlightjs/cdn-assets/es/languages/css.min.js';
import javascript from '@highlightjs/cdn-assets/es/languages/javascript.min.js';
import bash from '@highlightjs/cdn-assets/es/languages/bash.min.js';

core.registerLanguage('xml', xml);
core.registerLanguage('css', css);
core.registerLanguage('javascript', javascript);
core.registerLanguage('bash', bash);
core.registerAliases('markup', { languageName: 'xml' });
core.registerAliases('shell', { languageName: 'bash' });

/** Highlight.js escapes source text and emits its own token spans.
 * @param {string} source
 * @param {string} language
 * @returns {string | undefined} */
export function highlightCode(source, language) {
	const name = language.trim().toLowerCase();
	return core.getLanguage(name)
		? core.highlight(source, { language: name, ignoreIllegals: true }).value
		: undefined;
}
