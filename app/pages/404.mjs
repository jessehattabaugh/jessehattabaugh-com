/**
 * @type {import('@enhance/types').EnhanceElemFn}
 */
export default function ({ html, state }) {
	const { error } = state.attrs;
	return html`<jh-header></jh-header>
		<main>
			<h1>Page not found</h1>
			<h2>Sorry we can't find that page.</h2>
			<p>${error && error}</p>
		</main>
		<jh-footer></jh-footer>`;
}
