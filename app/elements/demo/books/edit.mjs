/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html }) {
	return html`<hyper-form id="editBook" method="PUT">
	<form action="/demo/books/1" method="POST">
		<input type="hidden" name="method" value="PUT">
		<label for="title">Title</label>
		<input type="text" name="title">
		<input type="submit" value="edit book">
	</form>
</hyper-form>`;
}
