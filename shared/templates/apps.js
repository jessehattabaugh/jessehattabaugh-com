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

/** Inline SVG of the Rainbow Hour app icon (safe: no user content). */
const rainbowIcon =
	new Raw(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="64" height="64" aria-hidden="true">
  <defs>
    <linearGradient id="bg-rh" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#bae6fd"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#bg-rh)"/>
  <g stroke="#fbbf24" stroke-width="12" stroke-linecap="round">
    <path d="M150,58 v22"/><path d="M88,92 l16,16"/><path d="M212,92 l-16,16"/><path d="M68,150 h22"/>
  </g>
  <circle cx="150" cy="150" r="48" fill="#fde047"/>
  <g fill="none" stroke-linecap="round">
    <path d="M170,392 A150,150 0 0 1 470,392" stroke="#ef4444" stroke-width="19"/>
    <path d="M192,392 A128,128 0 0 1 448,392" stroke="#f97316" stroke-width="19"/>
    <path d="M214,392 A106,106 0 0 1 426,392" stroke="#facc15" stroke-width="19"/>
    <path d="M236,392 A84,84 0 0 1 404,392" stroke="#22c55e" stroke-width="19"/>
    <path d="M258,392 A62,62 0 0 1 382,392" stroke="#3b82f6" stroke-width="19"/>
    <path d="M280,392 A40,40 0 0 1 360,392" stroke="#8b5cf6" stroke-width="19"/>
  </g>
  <g fill="#ffffff">
    <ellipse cx="404" cy="356" rx="58" ry="34"/><circle cx="378" cy="336" r="26"/>
    <circle cx="416" cy="330" r="30"/><circle cx="444" cy="350" r="22"/>
  </g>
  <g fill="#0ea5e9">
    <path d="M382,398 c6,9 10,14 10,19 a10,10 0 0 1 -20,0 c0,-5 4,-10 10,-19"/>
    <path d="M414,402 c6,9 10,14 10,19 a10,10 0 0 1 -20,0 c0,-5 4,-10 10,-19"/>
    <path d="M446,398 c6,9 10,14 10,19 a10,10 0 0 1 -20,0 c0,-5 4,-10 10,-19"/>
  </g>
</svg>`);

/** @returns {import('../html.js').Raw} */
export const apps = () => {
	return layout({
		title: 'Apps',
		path: '/apps',
		description: 'Standalone progressive web apps by Jesse Hattabaugh.',
		body: html`
			<article>
				<h1>Apps</h1>
				<p>Standalone progressive web apps &mdash; install any of these on your device.</p>
				<ul class="apps-grid">
					<li>
						<a href="/apps/messages/" class="app-card">
							<div class="app-card__icon" aria-hidden="true">${messagesIcon}</div>
							<span class="app-card__name">Messages</span>
							<span class="app-card__desc">Send me a message</span>
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
						<div class="app-card__icon" aria-hidden="true">${rainbowIcon}</div>
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
