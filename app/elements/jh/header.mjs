/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html }) {
	return html`
		<style>
			header {
				backdrop-filter: blur(var(--unit-half));
				background-color: rgba(var(--rgb-background), 0.5);
				border-bottom: var(--border);
				box-shadow: 0 0 var(--unit) rgba(black, 0.5);
				left: 0;
				padding: var(--unit-half);
				position: sticky;
				top: 0;
			}
			h1 {
				padding: 0;
			}
			nav {
				display: flex;
				justify-content: space-around;
			}
		</style>
		<header class="no-print">
			<h1><a href="/">JesseHattabaugh.com</a></h1>
			<nav>
				<a href="/about">About</a>
				<a href="/ideas">Ideas</a>
				<a href="/now">Now</a>
				<a href="/resume">Resume</a>
				<a href="/share">Share</a>
			</nav>
		</header>
	`;
}
