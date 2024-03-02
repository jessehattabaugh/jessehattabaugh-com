/**  @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html, state }) {
	const { shares = [], error } = state.store;
	const items = shares.map((/** @type {Object} */ _, /** @type {Number} */ i) => {
		return `<li><jh-share index=${i}></jh-share></li>`;
	});
	// console.debug('🪺', { error, items, shares });
	return html`${error && `<div class="error">${error}</div>`}
	<ol>
		${items ? items.join('') : html`<li>🤷No shares</li>`}
	</ol>`;
}
