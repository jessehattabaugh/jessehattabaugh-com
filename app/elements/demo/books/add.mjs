/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html }) {
	// prettier-ignore
	return html`<hyper-status from="addBook">
	<span slot="loading" style="display: none;">adding book...</span>
	<span slot="success" style="display: none;">book added!</span>
	<span slot="error" style="display: none;">error adding book!</span>
</hyper-status>`;
}
