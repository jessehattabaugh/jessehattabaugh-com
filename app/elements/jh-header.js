/**
 * @type {import('@enhance/types').EnhanceElemFn}
 */
export default function ({ html }) {
	return html` <style>
			:host {
				flex: none;
			}
		</style>
		<header>
			<h1>
				<a href="/">JesseHattabaugh.com</a
				><b style="white-space: nowrap">🍄💻🚲☕</b>
			</h1>
		</header>
		<nav>
			<a href="#contact">Contact</a>
		</nav>`;
}
