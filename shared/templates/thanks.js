import { html } from '../html.js';
import { layout } from './layout.js';

/**
 * @returns {import('../html.js').Raw}
 */
export const thanks = () =>
	layout({
		title: 'Thanks',
		body: html`
			<article>
				<h1>Thanks!</h1>
				<p>Your message was received. I'll get back to you soon.</p>
				<p><a href="/">Back to home</a></p>
			</article>
		`,
	});
