/**
 * @type {import('@enhance/types').EnhanceElemFn}
 */
export default function ({ html, state }) {
	const { error } = state.attrs;
	return html`<main>
		<h1>Not Found - 404</h1>
		<h2>Sorry we can't find that.</h2>
		<p>${error && error}</p>
	</main>`;
}
