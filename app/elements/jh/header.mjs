/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html }) {
	return html`
		<style>
			:host {
				backdrop-filter: blur(var(--unit-half));
				background-color: rgba(var(--rgb-background), 0.5);
				border-bottom: var(--border);
				box-shadow: 0 0 var(--unit) rgba(black, 0.5);
				left: 0;
				padding: var(--unit-half);
				position: sticky;
				top: 0;
			}
		</style>
		<header>
			<article>
				<h1><a href="/">JesseHattabaugh.com</a></h1>
				<jh-nav></jh-nav>
			</article>
		</header>
	`;
}
