/** @type {import('@enhance/types').EnhanceElemFn}*/
export default function ({ html, state }) {
	const { error } = state.attrs;
	return html`<jh-header></jh-header>
		<main>
			<h2>Server error</h2>
			<p>There was a problem. Please try again.</p>
			<dl>
				<dt>error</dt>
				<dd>${error && error}</dd>
			</dl>
		</main>
		<jh-footer></jh-footer>`;
}
