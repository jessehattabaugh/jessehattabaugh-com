import { html } from '../html.js';

/**
 * Format a Unix-ms instant as a UTC HH:MM string for server-rendered window
 * times. UTC because the server cannot know the visitor's timezone; the JS
 * dashboard shows local times, and the raw instant rides along in `datetime`.
 * @param {number} ms
 */
function utcTime(ms) {
	return new Intl.DateTimeFormat('en-GB', {
		hour: '2-digit',
		minute: '2-digit',
		timeZone: 'UTC',
	}).format(new Date(ms));
}

/**
 * @param {{ values: { lat?: string, lon?: string }, windows?: Array<{ startMs: number, endMs: number }> }} opts
 */
const windowResults = ({ values, windows }) => {
	if (!windows) {
		return html``;
	}
	if (windows.length === 0) {
		return html`
			<p role="status">No rainbow windows today — the sun never dips into the rainbow band.</p>
		`;
	}
	return html`
		<div role="status" aria-live="polite">
			<h2>Rainbow windows near ${(values.lat ?? '')}°, ${(values.lon ?? '')}°</h2>
			<p>Times in UTC — between these moments the sun is low enough for rainbows.</p>
			<ul>
				${windows.map((w) => {
					return html`
						<li>
							<time datetime="${new Date(w.startMs).toISOString()}">${utcTime(w.startMs)}</time>
							–
							<time datetime="${new Date(w.endMs).toISOString()}">${utcTime(w.endMs)}</time>
							UTC
						</li>
					`;
				})}
			</ul>
			<p>Look opposite the sun: morning rainbows in the west, evening rainbows in the east.</p>
		</div>
	`;
};

/**
 * The Rainbow Hour PWA document shell.
 *
 * The static body below is the complete no-JS product: an explainer and a GET
 * form that asks the Worker for today's rainbow windows at any coordinates.
 * With JS, <rainbow-hour-app> boots inside the same element and prepends the
 * live dashboard (geolocation, current-sky check, alert subscription) above
 * this content — the manual form stays available in every mode.
 *
 * @param {object} [opts]
 * @param {string} [opts.error]  validation error for the form
 * @param {{ lat?: string, lon?: string }} [opts.values]  previously submitted values
 * @param {Array<{ startMs: number, endMs: number }>} [opts.windows]  computed for values, when valid
 * @returns {import('../html.js').Raw}
 */
export const rainbowHourPage = ({ error, values = {}, windows } = {}) => {
	return html`<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>Rainbow Hour — Jesse Hattabaugh</title>
		<meta name="description" content="Get a nudge when rain clears under a low sun and a rainbow is likely." />
		<meta name="theme-color" content="#0ea5e9" />

		<link rel="manifest" href="/apps/rainbow-hour/manifest.json" />
		<link rel="icon" href="/apps/rainbow-hour/icon.svg" type="image/svg+xml" />
		<link rel="apple-touch-icon" href="/apps/rainbow-hour/icon.svg" />
		<link rel="stylesheet" href="/apps/rainbow-hour/styles.css" />
	</head>
	<body>
		<rainbow-hour-app>
			<article class="rh-static">
				<header class="rh-header">
					<p><a href="/apps/">← All apps</a></p>
					<h1><span aria-hidden="true">🌈</span> Rainbow Hour</h1>
					<p class="rh-tagline">
						A nudge when rain clears under a low sun — the exact moment skies grow rainbows.
					</p>
				</header>

				<section aria-labelledby="rh-how-title">
					<h2 id="rh-how-title">What makes a rainbow</h2>
					<ul>
						<li><strong>Rain in the air</strong> — falling now or within the last few hours.</li>
						<li><strong>A low sun</strong> — above the horizon but below 42° high.</li>
						<li><strong>Bright spells</strong> — broken cloud, so sunlight reaches the drops.</li>
					</ul>
					<p>
						All three at once is rare and brief — that's the rainbow hour. Look opposite the
						sun: morning rainbows hang in the west, evening ones in the east.
					</p>
				</section>

				<section aria-labelledby="rh-plan-title">
					<h2 id="rh-plan-title">Plan today's rainbow hunt</h2>
					<p>
						Enter any coordinates to get today's rainbow window times, computed for that
						spot. Nothing is stored.
					</p>
					<form method="get" action="/apps/rainbow-hour/" data-no-enhance>
						<div class="rh-fields">
							<div class="field">
								<label for="lat">Latitude</label>
								<input
									id="lat"
									name="lat"
									type="number"
									step="any"
									min="-90"
									max="90"
									placeholder="40.7128"
									required
									value="${values.lat ?? ''}"
								/>
							</div>
							<div class="field">
								<label for="lon">Longitude</label>
								<input
									id="lon"
									name="lon"
									type="number"
									step="any"
									min="-180"
									max="180"
									placeholder="-74.006"
									required
									value="${values.lon ?? ''}"
								/>
							</div>
						</div>
						<button type="submit">Show rainbow windows</button>
					</form>
					${error ? html`<p class="error" role="alert">${error}</p>` : html``}
					${windowResults({ values, windows })}
				</section>

				<p class="rh-privacy">
					This page works without JavaScript. The alert feature uses your device's location
					only to time a wake-up check — coordinates are rounded to ~1&nbsp;km and you can
					remove them any time by turning alerts off.
				</p>
			</article>
		</rainbow-hour-app>

		<script type="module" src="/apps/rainbow-hour/app.js"></script>
	</body>
</html>
`;
};
