/**  @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html, state }) {
	const { attrs, store } = state;
	const { index } = attrs;
	const { image, isAuthorized, title, createdAt, text, url } = store.shares[index];
	// console.debug('🧼', { title, createdAt, text, url });
	return html`<article style="margin-bottom: calc(var(--unit) * 2) ">
		${title && `<h3>${url ? `<a href="${url}">${title}</a>` : title}</h3>`}
		${text && `<section>${text}</section>`}
		<dl>
			<dt>by</dt>
			<dd>${isAuthorized ? `Jesse Hattabaugh` : `unknown`}</dd>
			<dt>created at</dt>
			<dd>
				${new Date(createdAt).toLocaleDateString()},
				${new Date(createdAt).toLocaleTimeString()}
			</dd>
		</dl>
		${image && `<img style="max-width: 100%" src="${image}" />`}
	</article>`;
}
