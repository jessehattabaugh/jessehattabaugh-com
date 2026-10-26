import { html } from '../../shared/html.js';
import { layout } from '../../shared/templates/layout.js';
import { paths } from '../../shared/routes.js';

export function homeFragment() {
	return html`
			<section>
				<h1>Useful tools and web experiments</h1>
				<p>Small apps, practical tools, and things to share.</p>
				<p>
					This site is a home for experiments with the open web. Explore apps you can
					use in your browser, find something free to take home, or take a look at how
					the site is built.
				</p>
				<nav aria-label="Quick links">
					<a href="${paths.apps}" class="btn">Explore the apps</a>
					<a href="${paths.messages}" class="btn btn--outline">Contact</a>
				</nav>
			</section>
			<section aria-labelledby="explore-heading">
				<h2 id="explore-heading">What you can find here</h2>
				<ul>
					<li>
						<h3><a href="${paths.apps}">Apps</a></h3>
						<p>Watch for rainbows, discover holiday lights, or log workouts with a virtual pet. Use the apps in your browser or install them on your device.</p>
					</li>
					<li>
						<h3><a href="${paths.about}">About</a></h3>
						<p>Meet the person behind the site and catch up on recent Bluesky posts.</p>
					</li>
					<li>
						<h3><a href="${paths.colophon}">How this site works</a></h3>
						<p>A look at the ideas and choices behind a site built for the open web.</p>
					</li>
					<li>
						<h3><a href="${paths.giving}">Giving away</a></h3>
						<p>Browse free items being passed along through GiftHood, with photos and availability.</p>
					</li>
				</ul>
			</section>
		`;
}

/**
 * @returns {import('../../shared/html.js').Raw}
 */
export const home = () => {
	return layout({
		title: 'Home',
		path: '/',
		description: 'Explore small web apps, useful tools, open web experiments, and free items to give away.',
		body: homeFragment(),
	});
};
