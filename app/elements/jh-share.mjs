/**  @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html, state }) {
	const { attrs, store } = state;
	const { isAuthorized } = store;
	const { index } = attrs;
	const {
		shareId,
		image,
		wasAuthorized = isAuthorized,
		title,
		createdAt,
		text,
		url,
	} = store.shares[index];
	// console.debug('🧼', { title, createdAt, text, url });
	return html`<article style="margin-bottom: calc(var(--unit) * 2) ">
			${title && `<h3>${url ? `<a href="${url}">${title}</a>` : title}</h3>`}
			${text && `<section>${text}</section>`}
			${image && `<img style="max-width: 100%" src="${image}" />`}
			<dl>
				<dt>by</dt>
				<dd>${wasAuthorized ? `Jesse Hattabaugh` : `unknown`}</dd>
				<dt>created at</dt>
				<dd>
					${new Date(createdAt).toLocaleDateString()},
					${new Date(createdAt).toLocaleTimeString()}
				</dd>
			</dl>
			${isAuthorized
				? html`<button
						class="deleteShare"
						data-shareId="${shareId}"
						data-createdAt="${createdAt}"
				  >
						delete
				  </button>`
				: ``}
		</article>
		${isAuthorized
			? html`<script type="module">
					document.querySelectorAll('.deleteShare').forEach((button) => {
						button.addEventListener('click', async (event) => {
							const { shareid, createdat } = event.target.dataset;
							console.debug('👻deleting', { shareid, createdat });
							if (createdat && shareid) {
								const deleteUrl = '/shares/' + createdat + '/' + shareid;
								console.debug('🐕‍🦺 fetching delete', { deleteUrl });
								const response = await fetch(deleteUrl, {
									headers: { accept: 'application/json' },
									method: 'DELETE',
								});
								if (response.ok) {
									console.debug('💣share deleted successfully', response);
									document.location.reload();
								} else {
									console.error('🍒error deleting share', response);
								}
							}
						});
					});
			  </script>`
			: ''}`;
}
