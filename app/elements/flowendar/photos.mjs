/**  @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html, state }) {
	const { photos = [] } = state.store;
	const items = photos.map((/** @type {Object} */ _, /** @type {Number} */ i) => {
		return `<li>
			<figure>
				<picture>
					<source srcset="${photos[i].href}" type="image/webp" />
					<source srcset="${photos[i].href}" type="image/jpeg" />
					<img src="${photos[i].href}" alt="Photo ${i + 1}" />
				</picture>
				<figcaption>${photos[i].date}</figcaption>
			</figure>
		</li>`;
	});
	//console.debug('🪺', { items, photos });
	return html`<ol>
		${items ? items.join('') : html`<li>🤷No photos</li>`}
	</ol>`;
}
