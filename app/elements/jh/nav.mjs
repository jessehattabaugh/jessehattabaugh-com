/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html }) {
	return html`<nav class="no-print">
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
