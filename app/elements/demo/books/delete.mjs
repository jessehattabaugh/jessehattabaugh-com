/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html }) {
	// prettier-ignore
	return html`<hyper-link id="deleteBook" method="DELETE">
	<a href="/demo/books/1?method=DELETE">delete book</a>
</hyper-link>`;
}
