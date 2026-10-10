import { html } from '../html.js';
import { layout } from './layout.js';
import { paths } from '../routes.js';
import { installControls } from './install.js';

/**
 * @typedef {object} RainbowData
 * @property {{ display_name: string } | null} [user]
 * @property {string} [error]
 * @property {{ lat?: string, lon?: string }} [values]
 * @property {Array<{ startMs: number, endMs: number }>} [windows]
 * @property {{ likely: boolean, direction: string, factors: Array<{ label: string, pass: boolean }> }} [verdict]
 * @property {string} [vapidPublicKey]
 */

/** @param {number} ms */
const utcTime = (ms) => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(new Date(ms));

/** @param {RainbowData} data */
function windowResults({ values = {}, windows }) {
	if (!windows) { return html``; }
	if (!windows.length) { return html`<p role="status">No rainbow windows today — the sun never dips into the rainbow band.</p>`; }
	return html`<section aria-label="Rainbow windows">
		<h2>Rainbow windows near ${values.lat ?? ''}°, ${values.lon ?? ''}°</h2>
		<p>Times in UTC — between these moments the sun is low enough for rainbows.</p>
		<ul>${windows.map((window) => html`<li><time datetime="${new Date(window.startMs).toISOString()}">${utcTime(window.startMs)}</time> – <time datetime="${new Date(window.endMs).toISOString()}">${utcTime(window.endMs)}</time> UTC</li>`)}</ul>
		<p>Look opposite the sun: morning rainbows in the west, evening rainbows in the east.</p>
	</section>`;
}

/** @param {RainbowData} data */
function skyResults({ verdict }) {
	if (!verdict) { return html``; }
	return html`<section aria-label="Sky check result">
		<h2>Sky check result</h2>
		<p role="status">${verdict.likely ? `Rainbow likely — look ${verdict.direction}!` : 'No rainbow likely right now.'}</p>
		<ul aria-label="Rainbow factors">${verdict.factors.map((factor) => html`<li data-pass="${String(factor.pass)}">${factor.pass ? '✓' : '✗'} ${factor.label}</li>`)}</ul>
		<p>This is a rough nudge based on current weather, not a guaranteed forecast.</p>
	</section>`;
}

/** @param {RainbowData} [data] */
export function rainbowHourFragment(data = {}) {
	const { values = {}, error } = data;
	return html`<article data-rainbow>
		<header>
			<img src="/apps/rainbow-hour/icon.svg" alt="" width="112" height="112" />
			<div><p>Sunshine. Showers. A little magic.</p><h1>Rainbow Hour</h1>
			<p>A nudge when rain clears under a low sun — the moment skies grow rainbows.</p></div>
		</header>
		<section aria-label="What makes a rainbow">
			<h2>What makes a rainbow</h2>
			<ul><li><strong>Rain in the air</strong> — falling now or recently.</li><li><strong>A low sun</strong> — between 2° and 42° high.</li><li><strong>Bright spells</strong> — broken cloud, so sunlight reaches the drops.</li></ul>
		</section>
		<section aria-label="Plan today's rainbow hunt">
			<h2>Plan today's rainbow hunt</h2>
			<p>Enter coordinates to calculate today's windows or check the current sky.</p>
			${error ? html`<p role="alert">${error}</p>` : html``}
			<button type="button" class="btn btn--outline" data-locate hidden>Use my location</button>
			<form method="get" action="${paths.rainbow}" data-target="#main" aria-label="Rainbow conditions">
				<label for="lat">Latitude</label>
				<input id="lat" name="lat" type="number" step="any" min="-90" max="90" required value="${values.lat ?? ''}" />
				<label for="lon">Longitude</label>
				<input id="lon" name="lon" type="number" step="any" min="-180" max="180" required value="${values.lon ?? ''}" />
				<button type="submit" class="btn">Show rainbow windows</button>
				<button type="submit" name="sky" value="1" class="btn btn--outline">Check the sky now</button>
			</form>
			<p role="status" aria-label="Location" data-location></p>
			<p role="status" aria-label="Sun position" data-sun></p>
			${windowResults(data)}
			${skyResults(data)}
		</section>
		${data.vapidPublicKey ? html`<form method="post" action="${paths.rainbowPush}" data-return="${paths.rainbow}" data-push data-key="${data.vapidPublicKey}" data-no-enhance hidden>
			<button type="submit" class="btn btn--outline" aria-pressed="false">Enable rainbow alerts</button>
		</form>` : html``}
		<p role="status" aria-label="Browser features" data-browser-status></p>
		${installControls('Rainbow Hour')}
		<p>Alerts use rounded coordinates (about 1 km precision) to time checks. Disable alerts to remove your subscription. Manual sky checks send your coordinates to the weather service through this server; automatic alert checks run on your device.</p>
	</article>`;
}

/** @param {RainbowData} [data] */
export function rainbowHourPage(data = {}) {
	return layout({
		title: 'Rainbow Hour', path: paths.rainbow, app: 'rainbow-hour', user: data.user,
		description: 'Find rainbow windows and check when rain clears under a low sun.',
		body: rainbowHourFragment(data),
		head: html`<meta name="theme-color" content="#38bdf8" /><link rel="manifest" href="/apps/rainbow-hour/manifest.json" /><link rel="icon" href="/apps/rainbow-hour/icon.svg" type="image/svg+xml" /><link rel="stylesheet" href="/apps/rainbow-hour/styles.css" />`,
		scripts: html`<script type="module" src="/apps/rainbow-hour/app.js" data-service-worker="/apps/rainbow-hour/sw.js" data-scope="/apps/rainbow-hour/"></script>`,
	});
}
