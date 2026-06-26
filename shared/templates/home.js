import { html } from '../html.js';
import { layout } from './layout.js';

/**
 * @returns {import('../html.js').Raw}
 */
export const home = () => {
	return layout({
		title: 'Home',
		path: '/',
		description: 'Jesse Hattabaugh — software engineer, web developer.',
		body: html`
			<section>
				<h1>Jesse Hattabaugh</h1>
				<p>Software engineer building things for the web.</p>
				<p>
					I care about the web platform, progressive enhancement, and making things that
					work for everyone. Currently available for interesting projects.
				</p>
				<nav aria-label="Quick links">
					<a href="/about" class="btn">About me</a>
					<a href="/apps/messages/" class="btn btn--outline">Send me a message</a>
				</nav>
			</section>
		`,
	});
};
