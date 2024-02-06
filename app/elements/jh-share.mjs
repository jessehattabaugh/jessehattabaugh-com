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
				? html` <hyper-form
							action="/shares/${createdAt}/${shareId}"
							id="delete${shareId}"
							method="delete"
						></hyper-form
						><hyper-status for="delete${shareId}"></hyper-status>`
				: ``}
		</article>
		${isAuthorized
			? html`<script type="module" src="/_public/browser/HyperElements.mjs"></script>`
			: ''}`;
}
