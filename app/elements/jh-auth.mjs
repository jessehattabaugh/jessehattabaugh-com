/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html, state }) {
	const { store } = state;
	const { isAuthorized } = store;
	return html`<div>${isAuthorized ? `you are authorized!` : `device not authorized`}</div>`;
}
