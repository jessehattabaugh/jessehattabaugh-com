/**
 * @type {import('@enhance/types').EnhanceElemFn}
 */
export default function ({ html, state }) {
	const { error } = state.attrs;
	return html`<jh-header></jh-header>
		<main>
			<h2>Page not found</h2>
			<p>Sorry we can't find that page.</p>
			<dl>
				<dt>error</dt>
				<dd>${error && error}</dd>
			</dl>
		</main>
		<jh-footer></jh-footer>`;
}
