import { html } from '../../shared/html.js';
import { layout } from '../../shared/templates/layout.js';

/** @param {import('../../shared/data/atproto.js').Social} [social] @returns {import('../../shared/html.js').Raw} */
export const apps = (social) => {
	return layout({
		social,
		title: 'Apps',
		path: '/apps',
		description: 'Standalone progressive web apps by Jesse Hattabaugh.',
		body: html`
			<article>
				<h1>Apps</h1>
				<p>Standalone progressive web apps &mdash; install any of these on your device.</p>
				<ul class="apps-grid">
					<li><a href="/apps/crunch-time/" class="app-card"><div class="app-card__icon" aria-hidden="true"><img src="/apps/crunch-time/icon.svg" alt="" width="64" height="64" /></div><span class="app-card__name">Crunch Time</span><span class="app-card__desc">A situp-powered pocket pet</span><div class="app-card__tags"><span class="app-tag">Motion sensing</span><span class="app-tag">Voice coach</span><span class="app-tag">Virtual pet</span></div></a></li>
					<li><a href="/apps/lightsfinder/" class="app-card"><div class="app-card__icon" aria-hidden="true"><img src="/apps/lightsfinder/icon.svg" alt="" width="64" height="64" /></div><span class="app-card__name">Lightsfinder</span><span class="app-card__desc">Discover holiday lights and take the scenic route</span><div class="app-card__tags"><span class="app-tag">Photo sightings</span><span class="app-tag">Season awards</span><span class="app-tag">Driving loops</span></div></a></li>
					<li>
						<a href="/apps/messages/" class="app-card">
							<div class="app-card__icon" aria-hidden="true"><img src="./messages/icon.svg" alt="" width="64" height="64" /></div>
							<span class="app-card__name">Jessages</span>
							<span class="app-card__desc">Messages to Jesse</span>
							<div class="app-card__tags">
								<span class="app-tag">WebAuthn</span>
								<span class="app-tag">FIDO2</span>
								<span class="app-tag">Push API</span>
								<span class="app-tag">Service Workers</span>
								<span class="app-tag">Cloudflare D1</span>
								<span class="app-tag">Custom Elements</span>
						</div>
					</a>
				</li>
				<li>
					<a href="/apps/rainbow-hour/" class="app-card">
						<div class="app-card__icon" aria-hidden="true"><img src="./rainbow-hour/icon.svg" alt="" width="64" height="64" /></div>
						<span class="app-card__name">Rainbow Hour</span>
						<span class="app-card__desc">Know when rainbows are due</span>
						<div class="app-card__tags">
							<span class="app-tag">Geolocation API</span>
							<span class="app-tag">Web Push</span>
							<span class="app-tag">Service Workers</span>
							<span class="app-tag">Notifications API</span>
						</div>
					</a>
				</li>
			</ul>
		</article>
	`,
	});
};
