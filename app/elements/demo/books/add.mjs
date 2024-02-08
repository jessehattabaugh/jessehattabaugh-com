/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html }) {
	// prettier-ignore
	return html`<hyper-form id="addBook">
	<form action="/demo/books" method="POST">
		<input type="text" name="title" value="new title">
		<input type="submit" value="add book">
	</form>
</hyper-form>`;
}
