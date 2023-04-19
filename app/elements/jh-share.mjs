/**  @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html, state }) {
	const { attrs, store } = state;
	const { index } = attrs;
	const { isAuthorized, title, createdAt, text, url } = store.shares[index];
	// console.debug('🧼', { title, createdAt, text, url });
	return html`<article>
		<h3>${title}</h3>
		<h4>${new Date(createdAt).toLocaleDateString()}</h4>
		<section>${text}</section>
		<a href="${url}">${url}</a>
		<h5>${isAuthorized ? 'authorized' : 'unauthorized'}</h5>
	</article>`;
}
