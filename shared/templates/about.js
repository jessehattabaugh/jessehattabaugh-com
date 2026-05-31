import { html } from '../html.js';
import { layout } from './layout.js';

/**
 * @returns {import('../html.js').Raw}
 */
export const about = () =>
	layout({
		title: 'About',
		path: '/about',
		description: 'About Jesse Hattabaugh — software engineer and web developer.',
		body: html`
			<article>
				<h1>About</h1>
				<p>
					I'm Jesse Hattabaugh, a software engineer with a focus on the open web. I've
					been building for the web professionally since the mid-2000s.
				</p>
				<p>
					I believe in the web platform: standards, progressive enhancement, and making
					things accessible to everyone. The best software is often the simplest — no
					framework is faster than no framework.
				</p>
				<h2>What I do</h2>
				<ul>
					<li>Full-stack web development</li>
					<li>API design and integration</li>
					<li>Performance and accessibility consulting</li>
					<li>Open source contributions</li>
				</ul>
				<h2>Find me elsewhere</h2>
				<ul>
					<li>
						<a href="https://github.com/jessehattabaugh" rel="noopener noreferrer"
							>GitHub</a
						>
					</li>
					<li><a href="mailto:jesse@jessehattabaugh.com">Email</a></li>
				</ul>
			</article>
		`,
	});
