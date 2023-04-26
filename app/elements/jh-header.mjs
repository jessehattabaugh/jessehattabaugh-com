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
			nav {
				display: flex;
				justify-content: space-around;
			}
		</style>
		<header>
			<h1><a href="/">JesseHattabaugh.com</a></h1>
			<nav>
				<a href="/shares">Blog</a>
				<a href="/resume">Resume</a>
				<a href="/share">Share</a>
			</nav>
		</header>
	`;
}
