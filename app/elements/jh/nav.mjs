/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html }) {
	return html`<style>
		ul {
			display: flex;
			justify-content: space-evenly;
			flex-wrap: wrap;
		}
		li {
			list-style: none;
		}
		a {
			/* nice fat click target */
			display: block;
			padding: var(--unit);
			width: 100%;
		}
	</style>
	<nav>
		<ul>
			<li><a href="/share">Share</a></li>
			<li><a href="/about">About</a></li>
			<li><a href="/ideas">Ideas</a></li>
			<li><a href="/now">Now</a></li>
			<li><a href="/resume">Resume</a></li>
			<li><a href="/contact">Contact</a></li>
		</ul>
	</nav>`;
}
