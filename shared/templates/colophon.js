import { html } from '../html.js';
import { layout } from './layout.js';

/**
 * @returns {import('../html.js').Raw}
 */
export const colophon = () => {
	return layout({
		title: 'Colophon',
		path: '/colophon',
		description: 'How jessehattabaugh.com is built.',
		body: html`
			<article>
				<h1>Colophon</h1>
				<p>
					This site is a personal experiment in building with the grain of the web. No
					build-time UI framework, no client-side router, no virtual DOM.
				</p>
				<h2>Architecture</h2>
				<ul>
					<li>
						<strong>Hosting:</strong>
						<a href="https://workers.cloudflare.com/" rel="noopener noreferrer"
							>Cloudflare Workers</a
						>
						with static assets served from the edge.
					</li>
					<li>
						<strong>Database:</strong>
						<a href="https://developers.cloudflare.com/d1/" rel="noopener noreferrer"
							>Cloudflare D1</a
						>
						(SQLite at the edge).
					</li>
					<li>
						<strong>Templates:</strong> Plain JavaScript tagged template literals — the
						same functions render both the static build and live API responses.
					</li>
					<li>
						<strong>CSS:</strong> Native nesting and <code>@layer</code> for cascade
						control. No preprocessor.
					</li>
					<li>
						<strong>JavaScript:</strong> Progressive enhancement only. Every page and
						form works with JS disabled.
					</li>
				</ul>
				<h2>Principles</h2>
				<ul>
					<li>
						<strong>Progressive enhancement</strong> — the no-JS baseline is the
						product.
					</li>
					<li>
						<strong>HATEOAS</strong> — hypermedia as the engine of application state.
					</li>
					<li><strong>Web standards first</strong> — platform APIs before libraries.</li>
					<li>
						<strong>One template source</strong> — no duplicated markup between build
						and runtime.
					</li>
				</ul>
				<p>
					<a
						href="https://github.com/jessehattabaugh/jessehattabaugh-com"
						rel="noopener noreferrer"
					>
						Source code on GitHub
					</a>
				</p>
			</article>
		`,
	});
};
