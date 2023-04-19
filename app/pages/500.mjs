/** @type {import('@enhance/types').EnhanceElemFn}*/
export default function ({ html, state }) {
	const { error } = state.attrs;
	return html`<jh-header></jh-header>
		<main>
			<h1>Server error</h1>
			<h2>There was a problem. Please try again.</h2>
			<p>${error && error}</p>
		</main>
		<jh-footer></jh-footer>`;
}
