/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html }) {
	return html` <style>
			ul{
				display: flex;
				justify-content: space-around;
			}
			li {
				list-style: none;
			}
		</style>
		<nav>
			<ul>
				<li><a href="/about">About</a></li>
				<li><a href="/ideas">Ideas</a></li>
				<li><a href="/now">Now</a></li>
				<li><a href="/resume">Resume</a></li>
				<li><a href="/share">Share</a></li>
			</ul>
		</nav>`;
}
