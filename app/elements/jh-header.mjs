/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html }) {
	return html`
		<style>
			h1 {
				margin-bottom: 0.5em;
			}
		</style>
		<header>
			<h1><a href="/">JesseHattabaugh.com</a></h1>
			<nav>
				<a href="/share">Share</a>
				<a href="/resume">Resume</a>
			</nav>
		</header>
	`;
}
