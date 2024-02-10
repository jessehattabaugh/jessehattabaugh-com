/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html }) {
	return html`<hyper-update id="viewBook" from="getBook">
		<h2>Book 1</h2>
		<p>Author: Hemingway</p>
		<p>Published: 1952</p>
</hyper-update>
`;
}
