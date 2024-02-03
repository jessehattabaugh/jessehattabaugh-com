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
				? html`<enhanced-form method="delete">
						<form method="post" action="/shares/${createdAt}/${shareId}">
							<input type="submit" value="delete" />
						</form>
				  </enhanced-form>`
				: ``}
		</article>
		${isAuthorized
			? html`<script type="module">
					const EnhancedForm = class extends HTMLElement {
						constructor() {
							super();
							const method = this.getAttribute('method');
							const form = this.querySelector('form');
							form.addEventListener('submit', async (event) => {
								event.preventDefault();
								const action = form.getAttribute('action');
								console.debug('🐕‍🦺 enhanced-form fetching', { action, method });
								const response = await fetch(action, {
									headers: { accept: 'application/json' },
									method,
								});
								if (response.ok) {
									console.debug('🥗enhanced-form success', response);
									document.location.reload();
									// TODO: allow for something other than reloading the page
								} else {
									console.error('🍒enhanced-form failure', response);
								}
							});
						}
					};
					document.customElements.define('enhanced-form', EnhancedForm);
			  </script>`
			: ''}`;
}
