/** render a list of photo albums
 * @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html, state }) {
	const { store } = state;
	console.debug('📸', { store });
	const { albums = [], error } = state.store;
	// console.debug('📸', { photos, error });
	return html`${error && `<div class="error">${error}</div>`}
		<ol>
			${albums
				.map((/** @type {Object} */ _, /** @type {Number} */ i) => {
					return `<li><jh-album index=${i}></jh-album></li>`;
				})
				.join('')}
		</ol>`;
}
