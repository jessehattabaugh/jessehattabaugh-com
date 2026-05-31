import { html } from '../html.js';
import { layout } from './layout.js';

/**
 * @param {object} [opts]
 * @param {string} [opts.message]
 * @returns {import('../html.js').Raw}
 */
export const error = ({ message } = {}) => {
	return layout({
		title: '500 Server Error',
		body: html`
			<article>
				<h1>Something went wrong</h1>
				<p>${message ?? 'An unexpected error occurred. Please try again.'}</p>
				<p><a href="/">Back to home</a></p>
			</article>
		`,
	});
};
