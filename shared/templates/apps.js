import { html, Raw } from '../html.js';
import { layout } from './layout.js';

/** Inline SVG of the Messages app icon (safe: no user content). */
const messagesIcon =
	new Raw(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="64" height="64" aria-hidden="true">
  <defs>
    <linearGradient id="bg-msg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#06b6d4"/>
      <stop offset="100%" stop-color="#10b981"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#bg-msg)"/>
  <path d="M112,136 H400 A32,32 0 0,1 432,168 V296 A32,32 0 0,1 400,328 H284 L252,376 L252,328 H112 A32,32 0 0,1 80,296 V168 A32,32 0 0,1 112,136 Z" fill="white"/>
  <circle cx="182" cy="232" r="18" fill="#06b6d4"/>
  <circle cx="256" cy="232" r="18" fill="#0891b2"/>
  <circle cx="330" cy="232" r="18" fill="#10b981"/>
</svg>`);

/** @returns {import('../html.js').Raw} */
export const apps = () => {
	return layout({
		title: 'Apps',
		path: '/apps',
		description: 'Mini-apps by Jesse Hattabaugh.',
		body: html`
			<article>
				<h1>Apps</h1>
				<p>Standalone progressive web apps — install any of these on your device.</p>
				<div class="apps-grid" role="list">
					<a href="/apps/messages/" class="app-card" role="listitem">
						<div class="app-card__icon" aria-hidden="true">${messagesIcon}</div>
						<span class="app-card__name">Messages</span>
						<span class="app-card__desc">Send me a message</span>
					</a>
				</div>
			</article>
		`,
	});
};
