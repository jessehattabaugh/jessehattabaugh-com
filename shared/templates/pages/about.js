import { html } from '../../html.js';
import { layout } from '../layout.js';
import { actorFragment, profileSummary, postsFragment } from './social.js';

/** @param {import('../../data/atproto.js').Social} [social] */
export function aboutFragment(social) {
	return html`
		<article>
			<h1>About Me</h1>
			<p>
				I'm <a href="mailto:me@jessehattabaugh.com">Jesse Hattabaugh</a>, a software
				engineer with a focus on the open web.
			</p>
			<p>
				I believe in the web platform: standards, progressive enhancement, and making things
				accessible to everyone. The best software is often the simplest — no framework is
				faster than no framework.
			</p>
			<h2>What I do</h2>
			<ul>
				<li>Full-stack web development</li>
				<li>API design and integration</li>
				<li>Performance and accessibility consulting</li>
				<li>
					<a href="https://github.com/jessehattabaugh" rel="noopener noreferrer"
						>Open source contributions</a
					>
				</li>
			</ul>
			<h2>Find me on the Atmosphere</h2>
			<p>My name on Bluesky is @jessehattabaugh and I experiment with ATProto there.</p>
			${profileSummary(social)} ${actorFragment(social, true)} ${postsFragment(social)}
		</article>
	`;
}

/**
 * @param {import('../../data/atproto.js').Social} [social]
 * @returns {import('../../html.js').Raw}
 */
export const about = (social) => {
	return layout({
		title: 'About Me',
		path: '/about',
		description: 'About Jesse Hattabaugh — software engineer and web developer.',
		social,
		body: aboutFragment(social),
	});
};
