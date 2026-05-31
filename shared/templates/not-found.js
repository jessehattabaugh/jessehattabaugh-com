import { html } from '../html.js';
import { layout } from './layout.js';

/**
 * @returns {import('../html.js').Raw}
 */
export const notFound = () => {
	return layout({
		title: '404 Not Found',
		body: html`
			<article>
				<h1>Page not found</h1>
				<p>There's nothing at this URL.</p>
				<p><a href="/">Back to home</a></p>
			</article>
		`,
	});
};
