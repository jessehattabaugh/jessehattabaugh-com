/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html, state }) {
	const { store } = state;
	const { isAuthorized } = store;
	switch (isAuthorized) {
		case true:
			return html`<a href="/auth/out">Unauthorize</a>`;
		case false:
			return html`<a href="/auth/in">Authorize</a>`;
		default:
			return html`isAuthorized is ${isAuthorized}: ${typeof isAuthorized}⁉️`;
	}
}
