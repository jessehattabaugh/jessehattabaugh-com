/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html, state }) {
	const { action, href, method } = state.attrs;
	if (action) {
		return html`<form method="post" action="${action}">
			<input type="hidden" name="method" value="${method}" />
			<slot></slot>
			<slot name="submit"><button type="submit">${method}</button></slot>
		</form>`;
	} else if (href) {
		// add the method to the query params
		const params = new URLSearchParams(href.split('?')[1]);
		params.set('method', method);
		const url = href.split('?')[0] + '?' + params.toString();

		return html`<a href="${url}"><slot></slot></a>`;
	}
}
