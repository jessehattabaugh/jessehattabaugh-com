/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html, state }) {
	const { href, method = 'GET' } = state.attrs;
	const { host } = state.store;
	const METHOD = method.toUpperCase();

	// add the method to the query params
	const url = new URL(href, host);
	const { searchParams } = url;
	const newSearchParams = new URLSearchParams(searchParams);
	newSearchParams.set('method', METHOD);
	url.search = newSearchParams.toString();

	return html`<a href="${url.toString()}"><slot></slot></a>`;
}
