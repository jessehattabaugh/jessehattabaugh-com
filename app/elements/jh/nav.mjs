/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html }) {
	return html`<style>
		ul {
			display: block;
			text-wrap: pretty;
			text-align: center;
		}
		li {
			list-style: none;
			display: inline-block;

		}
		a {
			/* nice fat click target */
			display: block;
			padding: var(--unit-half);
			width: 100%;
		}
	</style>
	<nav>
		<ul>
			<li><a href="/about">About</a></li>
			<li><a href="/colophon">Colophon</a></li>
			<li><a href="/contact">Contact</a></li>
			<li><a href="/ideas">Ideas</a></li>
			<li><a href="/now">Now</a></li>
			<li><a href="/resume">Resume</a></li>
			<li><a href="/share">Share</a></li>
		</ul>
	</nav>`;
}
