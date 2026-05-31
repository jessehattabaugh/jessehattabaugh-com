import { html } from '../html.js';
import { layout } from './layout.js';

/**
 * @returns {import('../html.js').Raw}
 */
export const home = () =>
	layout({
		title: 'Home',
		path: '/',
		description: 'Jesse Hattabaugh — software engineer, web developer.',
		body: html`
			<section class="hero">
				<h1>Jesse Hattabaugh</h1>
				<p class="lead">Software engineer building things for the web.</p>
				<p>
					I care about the web platform, progressive enhancement, and making things that
					work for everyone. Currently available for interesting projects.
				</p>
				<nav aria-label="Quick links">
					<a href="/about" class="button">About me</a>
					<a href="/contact" class="button button--outline">Get in touch</a>
				</nav>
			</section>
		`,
	});
