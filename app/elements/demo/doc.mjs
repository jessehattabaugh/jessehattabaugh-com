/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html, state }) {
	const { attrs } = state;
	const { id } = attrs;
	return html`<h3>example</h3>
		<pre><code id="${id}-example"></code></pre>

		<div class=".no-print">
			<h3>demonstration</h3>
			<blockquote id="${id}-demonstration">
				<slot name="code"></slot>
			</blockquote>
		</div>`;
}
