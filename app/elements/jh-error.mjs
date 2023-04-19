/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html, state }) {
	const { store } = state;
	const { error } = store;
	return html`${error && `<div>${error}</div>`}`;
}
