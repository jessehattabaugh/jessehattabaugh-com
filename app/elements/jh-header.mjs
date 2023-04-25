/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html }) {
	return html`
		<style>
			header {
				margin: 0 var(--unit);
			}
			h1 {
				margin-bottom: calc(var(--unit) / 2);
			}
		</style>
		<header>
			<h1><a href="/">JesseHattabaugh.com</a></h1>
			<nav>
				<a href="/shares">Shares</a>
			</nav>
		</header>
	`;
}
