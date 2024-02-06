/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html }) {
	return html`<style>
			[slot] {
				display: none;
			}
		</style>
		<slot name="loading" as="div">Loading...</slot>
		<slot name="success" as="div">Success!</slot>
		<slot name="error" as="div">An error occurred.</slot>`;
}
