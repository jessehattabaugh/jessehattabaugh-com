import { html } from '../lib/html.js';

/**
 * Home page handler
 * @param {Object} event - Lambda event object
 * @returns {string} Complete HTML page
 */
export async function get() {
	return html`<div class="hero">
		<h2>Welcome to my personal website!</h2>
		<p>I'm a software developer passionate about creating amazing web experiences.</p>

		<section class="intro">
			<h3>What I Do</h3>
			<ul>
				<li>Full-stack web development</li>
				<li>Cloud architecture and serverless applications</li>
				<li>Modern JavaScript and web technologies</li>
			</ul>
		</section>

		<section class="recent-work">
			<h3>Recent Projects</h3>
			<p>Check out some of my latest work and experiments.</p>
			<a href="/about" class="cta-button"> Learn More About Me </a>
		</section>
	</div>`;
}
