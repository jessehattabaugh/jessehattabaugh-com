/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html, state }) {
	const { store } = state;

	// when this element is rendered by the docs page the store will not have books
	const { books = ['Old Man and the Sea', 'Grapes of Wrath', 'Brave New World'], page } = store;
	console.debug('📚 /demo/books/list.mjs', { books, page });
	return html`<hyper-update id="bookList" from="nextBooks, prevBooks">
	<ul>
		${books
			.map((book) => {
				return html`<li>${book}</li>
		`;
			})
			.join('').trim()}
	</ul>
	<hyper-link id="${page ? 'prevBooks' : 'nextBooks'}">
		<a href="/demo/books?page=${parseInt(page) ? 0 : 1}">${parseInt(page) ? 'Previous Page' : 'Next Page'}</a>
	</hyper-link>
</hyper-update>
`;
}
