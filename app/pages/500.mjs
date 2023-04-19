/** @type {import('@enhance/types').EnhanceElemFn}*/
export default function ({ html, state }) {
	const { error } = state.attrs;
	return html`<jh-header></jh-header>
		<main>
			<h2>Oops! Server error</h2>
			<p>There was a problem. Please try again.</p>
			${error &&
			`<dl>
				<dt>error</dt>
				<dd>${error}</dd>
			</dl>`}
		</main>
		<jh-footer></jh-footer>`;
}
