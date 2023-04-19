/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html, state }) {
	const { store } = state;
	const { isAuthorized } = store;
	switch (isAuthorized) {
		case true:
			return html`<a href="/auth/out">Unauthorize</a>`;
		default:
			return html`<a href="/auth/in">Authorize</a>`;
	}
}
