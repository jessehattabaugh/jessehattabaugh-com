/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html, state }) {
	const { action, href, method = 'GET' } = state.attrs;
	const METHOD = method.toUpperCase();
	const isGet = METHOD == 'GET';
	const isPost = METHOD == 'POST';

	// render a form
	if (action) {
		return html`<form ${isGet ? '' : `method="POST"`} action="${action}">
			${isGet || isPost ? '' : html`<input type="hidden" name="method" value="${METHOD}" />`}
			<slot></slot>
			<slot name="submit"><button type="submit">${method}</button></slot>
		</form>`;
	}

	// ... or render a link
	else if (href) {
		// add the method to the query params
		const params = new URLSearchParams(href.split('?')[1]);
		params.set('method', method);
		const url = href.split('?')[0] + '?' + params.toString();

		return html`<a href="${url}"><slot></slot></a>`;
	}
}
