/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html, state }) {
	const { store } = state;
	const { books = ['Old Man and the Sea', 'Grapes of Wrath', 'Brave New World'], page } = store;
	console.debug('📚 /demo/books/list.mjs', { books, page });
	return html`<hyper-update id="bookList" for="nextBooks, prevBooks">
	<div slot="loading" style="display: none;">loading books...</div>
	<div slot="error" style="display: none;">error loading books</div>
	<ul>
		${books
			.map((book) => {
				return html`<li>${book}</li>`;
			})
			.join('')}
	</ul>
	<hyper-link id="${page ? 'prevBooks' : 'nextBooks'}">
		<a href="/demo/books?page=${parseInt(page) ? 0 : 1}"
			>${parseInt(page) ? 'Prev' : 'Next'}</a
		>
	</hyper-link>
</hyper-update>`;
}
