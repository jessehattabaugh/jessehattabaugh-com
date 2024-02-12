/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html, state }) {
	const {deleted, title} = state.store;
	if (deleted){
		return html`<span>book deleted!</span>
<p><a href="/demo/books">Back to list</a></p>`;
	} else {
		return html`<hyper-update id="viewBook" from="getBook">
	<h2>${title}</h2>
	<p>Author: Hemingway</p>
	<p>Published: 1952</p>
</hyper-update>`;
	}
}
