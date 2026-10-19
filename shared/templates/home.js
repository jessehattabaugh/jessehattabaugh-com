import { html } from '../html.js';
import { layout } from './layout.js';
import { postsFragment, profileSummary } from './social.js';

/**
 * @param {import('../data/atproto.js').Social} [social]
 * @returns {import('../html.js').Raw}
 */
export const home = (social) => {
	return layout({
		title: 'Home',
		path: '/',
		description: 'Jesse Hattabaugh — software engineer, web developer.',
		social,
		body: homeFragment(social),
	});
};

/** @param {import('../data/atproto.js').Social} [social] */
export function homeFragment(social) {
	return html`
			<section>
				<h1>Jesse Hattabaugh</h1>
				<p>Software engineer building things for the web.</p>
				<p>
					I care about the web platform, progressive enhancement, and making things that
					work for everyone. Currently available for interesting projects.
				</p>
				${profileSummary(social)}
				<nav aria-label="Quick links">
					<a href="/about" class="btn">About me</a>
					<a href="/apps/messages/" class="btn btn--outline">Send me a message</a>
				</nav>
			</section>
			${postsFragment(social)}
		`;
}
