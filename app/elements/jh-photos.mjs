/** displays a collection of photos
 *  @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html, state }) {
	const { photos = [], error } = state.store;
	// console.debug('📸', { photos, error });
	return html`${error && `<div class="error">${error}</div>`}
		<ol>
			${photos
				.map((/** @type {Object} */ _, /** @type {Number} */ i) => {
					return `<li><jh-photo index=${i}></jh-photo></li>`;
				})
				.join('')}
		</ol>`;
}
