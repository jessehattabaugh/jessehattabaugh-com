/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html, state }) {
	const { attrs } = state;
	const { id } = attrs;
	return html` <h3>Example</h3>
		<pre><code id="${id}-example"></code></pre>

		<div class="no-print">
			<h3>Demonstration</h3>
			<blockquote id="${id}-demonstration">
				<slot name="code"></slot>
				<slot name="extra"></slot>
			</blockquote>
		</div>`;
}
