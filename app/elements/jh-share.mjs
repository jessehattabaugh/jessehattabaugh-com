/**  @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html, state }) {
	const { attrs, store } = state;
	const { index } = attrs;
	const { shareId, image, isAuthorized, title, createdAt, text, url } = store.shares[index];
	// console.debug('🧼', { title, createdAt, text, url });
	return html`<article style="margin-bottom: calc(var(--unit) * 2) ">
			${title && `<h3>${url ? `<a href="${url}">${title}</a>` : title}</h3>`}
			${text && `<section>${text}</section>`}
			${image && `<img style="max-width: 100%" src="${image}" />`}
			<dl>
				<dt>by</dt>
				<dd>${isAuthorized ? `Jesse Hattabaugh` : `unknown`}</dd>
				<dt>created at</dt>
				<dd>
					${new Date(createdAt).toLocaleDateString()},
					${new Date(createdAt).toLocaleTimeString()}
				</dd>
			</dl>
			${isAuthorized ? html`<button data-delete-share="${shareId}">delete</button>` : ``}
		</article>
		${isAuthorized
			? html`<script type="module">
					document.querySelectorAll('[data-delete-share]').forEach((button) => {
						button.addEventListener('click', async (event) => {
							const shareId = event.target.dataset.deleteShare;
							console.debug('👻deleting', { shareId });
							if (shareId) {
								const response = await fetch('/shares/' + shareId, {
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
