/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html }) {
	return html`<hyper-status from="editBook">
	<span slot="loading" style="display: none;">updating book...</span>
	<span slot="success" style="display: none;">book updated!</span>
	<span slot="error" style="display: none;">error updating author!</span>
</hyper-status>`;
}
