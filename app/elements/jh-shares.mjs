/**  @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html, state }) {
	const { shares = [], error } = state.store;
	// console.debug('🪺', { shares, error });
	return html`${error && `<div class="error">${error}</div>`}
		<ol>
			${shares
				.map((/** @type {Object} */ _, /** @type {Number} */ i) => {
					return `<li><jh-share index=${i}></jh-share></li>`;
				})
				.join('')}
		</ol>`;
}
