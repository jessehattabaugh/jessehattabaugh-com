/**  @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html, state }) {
	const { attrs, store } = state;
	const { index } = attrs;
	const { isAuthorized, title, createdAt, text, url } = store.shares[index];
	// console.debug('🧼', { title, createdAt, text, url });
	return html`<article style="margin-bottom: calc(var(--unit) * 2) ">
		<h3>${!isAuthorized ? '(unauthorized) ' : ''}${title}</h3>
		<dl>
			<dt>created at</dt>
			<dd>${new Date(createdAt).toLocaleDateString()}</dd>
		</dl>
		<section>${text}</section>
		<a href="${url}">${url}</a>
	</article>`;
}
