/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html }) {
	return html`<hyper-update id="booksList" for="getBooks">
			<ul>
				<li>book 1</li>
			</ul>
		</hyper-update>
		<hyper-form id="getBooks">
			<form action="/books">
				<input type="submit" value="add book" />
			</form>
		</hyper-form>`;
}
