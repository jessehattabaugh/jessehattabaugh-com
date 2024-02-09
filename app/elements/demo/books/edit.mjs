/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html }) {
	return html`<hyper-status for="editBook">
	<span slot="loading" style="display: none;">updating book...</span>
	<span slot="success" style="display: none;">book updated!</span>
	<span slot="error" style="display: none;">error updating author!</span>
</hyper-status>
<hyper-form id="editBook" method="PUT">
	<form action="/demo/books/1" method="POST">
		<input type="hidden" name="method" value="PUT">
		<input type="text" name="title" value="old title">
		<input type="submit" value="update book">
	</form>
</hyper-form>`;
}
