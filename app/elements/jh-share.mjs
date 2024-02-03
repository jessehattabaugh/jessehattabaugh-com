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
				? html`<hx-fetch-status data-hx-targets="delete${shareId}">
							<div slot="loading" style="display: none;">Loading...</div>
							<div slot="success" style="display: none;">Success!</div>
							<div slot="error" style="display: none;">An error occurred.</div>
						</hx-fetch-status>
						<hx-fetch id="delete${shareId}" method="delete">
							<form method="post" action="/shares/${createdAt}/${shareId}">
								<input type="submit" value="delete" />
							</form>
						</hx-fetch>`
				: ``}
		</article>
		${isAuthorized
			? html`<script type="module">
					import { HXFetch, HXFetchStatus } from '/_public/browser/hxe.mjs';
					customElements.define('hx-fetch', HXFetch);
					customElements.define('hx-fetch-status', HXFetchStatus);
			  </script>`
			: ''}`;
}
