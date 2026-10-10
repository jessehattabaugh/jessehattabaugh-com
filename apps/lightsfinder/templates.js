import { html } from '../../shared/html.js';
import { layout } from '../../shared/templates/layout.js';
import { paths } from '../../shared/routes.js';
import { holidays, project } from './model.js';
import { installControls } from '../../shared/templates/install.js';

/** @typedef {import('./data.js').LightPost} Post */
/** @typedef {{holiday: string, season: number, lat: number, lon: number, radius: number, history: boolean, zoom: number, view: string, scope: 'county'|'state'|'country', region: string, countryRegion: string, stateRegion: string}} Filters */
/** @typedef {{posts: Post[], filters: Filters, user: {id: string, display_name: string, is_owner: number} | null, today: string, account?: {display_name: string} | null, error?: string, notice?: string, values?: Record<string, string>, selected?: Post | null, queue?: Post[], standings?: Awaited<ReturnType<typeof import('./data.js').awardStandings>>, circuit?: {posts: Post[], distance: number, duration: number, coordinates: number[][], steps: string[], navigation: string}, routeMessage?: string, truncated?: boolean}} LightsData */

/** @param {Filters} f @param {Record<string, string | number>} [changes] */
export function lightsHref(f, changes = {}) {
	const params = new URLSearchParams({ holiday: f.holiday, season: String(f.season), lat: String(f.lat), lon: String(f.lon), radius: String(f.radius), zoom: String(f.zoom), view: f.view, ...(f.history ? { history: '1' } : {}), scope: f.scope, region: f.region, countryRegion: f.countryRegion, stateRegion: f.stateRegion });
	for (const [key, value] of Object.entries(changes)) { params.set(key, String(value)); }
	return `${paths.lightsfinder}?${params}`;
}

/** @param {string} chosen */
function holidayOptions(chosen) {
	return html`${chosen.startsWith('custom:') ? html`<option selected value="${chosen}">🏮 ${chosen.slice(7)}</option>` : html``}${holidays.map((h) => html`<option value="${h.id}" ${h.id === chosen ? html`selected` : html``}>${h.icon} ${h.name}</option>`)}`;
}
/** @param {LightsData} data */
function map(data) {
	const { filters: f } = data;
	const center = project(f.lat, f.lon, f.zoom);
	const left = center.x - 384, top = center.y - 256;
	const tiles = [];
	const wrap = 2 ** f.zoom;
	for (let y = Math.floor(top / 256); y <= Math.floor((top + 512) / 256); y++) {
		for (let x = Math.floor(left / 256); x <= Math.floor((left + 768) / 256); x++) {
			if (y >= 0 && y < wrap) {
				tiles.push(html`<image href="https://tile.openstreetmap.org/${f.zoom}/${((x % wrap) + wrap) % wrap}/${y}.png" x="${x * 256 - left}" y="${y * 256 - top}" width="256" height="256" />`);
			}
		}
	}
	const points = (data.circuit?.coordinates ?? []).map(([lon, lat]) => {
		const p = project(lat, lon, f.zoom); return `${p.x - left},${p.y - top}`;
	}).join(' ');
	return html`<section aria-label="Lights map" data-map>
		<div data-map-caption><span>✦ Your next little adventure</span><span>${data.posts.length} sightings nearby</span></div>
		<svg viewBox="0 0 768 512" aria-label="Street map with holiday light sightings" role="img">
			<title>Holiday lights near ${f.lat.toFixed(3)}, ${f.lon.toFixed(3)}</title>
			${tiles}
			${points ? html`<polyline points="${points}" fill="none" stroke="#7433af" stroke-width="5" stroke-linejoin="round" />` : html``}
			<circle cx="384" cy="256" r="10" fill="#fff" stroke="#332445" stroke-width="4" /><circle cx="384" cy="256" r="3" fill="#332445" />
			${data.posts.map((p, i) => {
				const xy = project(p.lat, p.lon, f.zoom); let x = xy.x - left;
				const world = 256 * wrap;
				if (x > 768) { x -= world; } else if (x < 0) { x += world; }
				const y = xy.y - top;
				if (x < 12 || x > 756 || y < 20 || y > 490) { return html``; }
				return html`<a href="${lightsHref(f, { post: p.id })}" aria-label="View ${p.title}" data-predicted="${String(p.season < f.season)}">
					<title>${p.title} — ${p.address}</title><path d="M${x},${y + 18} l-13,-19 a17,17 0 1,1 26,0 Z" fill="${p.season < f.season ? '#fff8e8' : '#593475'}" stroke="#fff" stroke-width="3" />
					<text x="${x}" y="${y - 7}" text-anchor="middle" fill="${p.season < f.season ? '#593475' : '#fff'}" font-size="13" font-weight="700">${i + 1}</text>
				</a>`;
			})}
		</svg>
		<nav aria-label="Map controls">
			<a href="${lightsHref(f, { zoom: Math.min(16, f.zoom + 1) })}" aria-label="Zoom in">＋</a>
			<a href="${lightsHref(f, { zoom: Math.max(3, f.zoom - 1) })}" aria-label="Zoom out">−</a>
			<a href="${lightsHref(f, { lat: Math.min(85, f.lat + 0.01 * 2 ** (12 - f.zoom)) })}" aria-label="Pan north">↑</a>
			<a href="${lightsHref(f, { lon: (f.lon + 180 - 0.02 * 2 ** (12 - f.zoom) + 360) % 360 - 180 })}" aria-label="Pan west">←</a>
			<a href="${lightsHref(f, { lat: Math.max(-85, f.lat - 0.01 * 2 ** (12 - f.zoom)) })}" aria-label="Pan south">↓</a>
			<a href="${lightsHref(f, { lon: (f.lon + 180 + 0.02 * 2 ** (12 - f.zoom)) % 360 - 180 })}" aria-label="Pan east">→</a>
		</nav>
		<p data-attribution>Map © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> · Street tiles need an internet connection</p>
	</section>`;
}
/** @param {LightsData} data */
function search(data) {
	const f = data.filters;
	return html`<form action="${paths.lightsfinder}" method="get" aria-label="Find lights" data-target="#main" data-location-form>
		<div data-fields><label>Holiday<select name="holiday" aria-label="Holiday">${holidayOptions(f.holiday)}</select></label>
		<label>Season<input name="season" type="number" min="2000" max="${new Date(data.today).getUTCFullYear() + 1}" value="${f.season}" required /></label>
		<label>Within (km)<input name="radius" type="number" min="1" max="100" value="${f.radius}" required /></label></div>
		<label>Other holiday name (optional)<input name="customHoliday" maxlength="100" placeholder="Use with Other holiday / festival" /></label>
		<details><summary>Set your starting location</summary><p>The first view starts in Seattle. Enter coordinates or use GPS to explore anywhere.</p>
			<div data-fields><label>Latitude<input name="lat" type="number" step="any" min="-85" max="85" value="${f.lat}" required /></label>
			<label>Longitude<input name="lon" type="number" step="any" min="-180" max="180" value="${f.lon}" required /></label></div>
			<button type="button" data-locate hidden>Use my location</button><p role="status" data-location-status></p>
		</details>
		<label data-check><input name="history" type="checkbox" value="1" ${f.history ? html`checked` : html``} /> Include likely spots from the last 3 seasons</label>
		<button type="submit">Find the glow ↗</button>
	</form>`;
}
/** @param {Post} p @param {LightsData} data @param {boolean} [detail] */
function card(p, data, detail = false) {
	const { filters: f, today, user } = data;
	const active = p.status === 'active' && p.ends >= today && p.season === f.season;
	return html`<article aria-label="${p.title}" data-post>
		<img src="${paths.lightsfinder}?photo=${p.photo_id}" alt="${p.title} holiday decorations" width="640" height="420" loading="lazy" />
		<div><p data-eyebrow>${p.status === 'hidden' ? 'Hidden for review' : p.season < f.season ? `◇ Likely spot · seen in ${p.season}` : active ? '● Lights on' : '○ Lights taken down / season ended'}</p>
		<h3><a href="${lightsHref(f, { post: p.id })}">${p.title}</a></h3>
		<p>${p.address}</p><p>${p.description}</p>
		<p data-rating>★ ${p.votes ? p.average.toFixed(1) : 'New'} <span>· ${p.votes} ratings · Seen ${p.observed}</span></p>
		${detail ? html`<p>${p.county} · ${p.state} · ${p.country}</p><p>Expected through ${p.ends}. Public viewing only; do not enter private property.</p>
			<p><a href="https://www.openstreetmap.org/?mlat=${p.lat}&amp;mlon=${p.lon}#map=18/${p.lat}/${p.lon}">Open this location</a></p>
			<button type="button" data-share hidden>Share this sighting</button><p role="status" data-share-status></p>
			${user ? html`
				${active && user.id !== p.user_id ? html`<form method="post" action="${lightsHref(f)}" aria-label="Rate ${p.title}">
					<input type="hidden" name="action" value="rate" /><input type="hidden" name="id" value="${p.id}" />
					<label>Your rating<select name="score"><option value="5">5 — Spectacular</option><option value="4">4 — Lovely</option><option value="3">3 — Nice</option><option value="2">2 — A little sparkle</option><option value="1">1 — Disappointing</option></select></label><button>Save rating</button>
				</form>` : html``}
				<form method="post" action="${lightsHref(f)}" aria-label="Report ${p.title}">
					<input type="hidden" name="action" value="report" /><input type="hidden" name="id" value="${p.id}" />
					<label>Report reason<select name="reason"><option value="gone">Lights have been taken down</option><option value="spam">Spam or inappropriate content</option></select></label><button data-secondary>Send report</button>
				</form>
			` : html`<p><a href="${paths.login}?returnTo=lightsfinder">Sign in to rate or report</a></p>`}
		` : html``}</div>
	</article>`;
}
/** @param {LightsData} data */
function shareForm(data) {
	const v = data.values ?? {}, f = data.filters;
	return html`<section aria-label="Share lights" data-panel><p data-eyebrow>Good things are better shared</p><h2>Add a little magic to the map.</h2>
		<p>Spot something wonderful? Share a photo from the public street. Your photo, address, and coordinates will be public.</p>
		${!data.user ? html`<p><a data-button href="${paths.login}?returnTo=lightsfinder">Sign in to share lights ↗</a></p>` : html`
		<form method="post" action="${lightsHref(f)}" enctype="multipart/form-data" aria-label="Share a sighting" data-location-form>
			<input type="hidden" name="action" value="publish" />
			${v.photoId ? html`<input type="hidden" name="photoId" value="${v.photoId}" /><img data-preview src="${paths.lightsfinder}?photo=${v.photoId}" alt="Your saved photo, ready to publish" width="320" height="210" /><p>Your photo is saved for 24 hours while you finish this form.</p>` : html``}
			<label>Photo<input type="file" name="photo" accept="image/jpeg,image/png,image/webp" capture="environment" ${v.photoId ? html`` : html`required`} /></label>
			<p>JPEG, PNG, or WebP, up to 750 KB. Supported browsers resize camera photos before upload.</p>
			<label>Display title<input name="title" maxlength="100" required value="${v.title ?? ''}" placeholder="The pumpkin house on the corner" /></label>
			<label>What makes it special?<textarea name="description" maxlength="1000" rows="3">${v.description ?? ''}</textarea></label>
			<label>Street address<input name="address" maxlength="200" required value="${v.address ?? ''}" /></label>
			<div data-fields><label>County / district<input name="county" maxlength="100" required value="${v.county ?? ''}" /></label>
			<label>State / province<input name="state" maxlength="100" required value="${v.state ?? ''}" /></label>
			<label>Country<input name="country" maxlength="100" required value="${v.country ?? ''}" /></label></div>
			<p>Use consistent region names; these community labels determine award regions.</p>
			<div data-fields><label>Latitude<input name="lat" type="number" step="any" min="-85" max="85" required value="${v.lat ?? ''}" /></label>
			<label>Longitude<input name="lon" type="number" step="any" min="-180" max="180" required value="${v.lon ?? ''}" /></label></div>
			<button type="button" data-locate hidden>Use my location</button><p role="status" data-location-status></p>
			<div data-fields><label>Holiday<select name="holiday" aria-label="Holiday">${holidayOptions(v.holiday ?? f.holiday)}</select></label>
			<label>Season<input name="season" type="number" min="2000" max="${new Date(data.today).getUTCFullYear() + 1}" required value="${v.season ?? f.season}" /></label></div>
			<label>Other holiday name (required for Other)<input name="customHoliday" maxlength="100" value="${v.customHoliday ?? ''}" placeholder="e.g. Diwali or Hanukkah" /></label>
			<div data-fields><label>Date seen<input name="observed" type="date" max="${data.today}" required value="${v.observed ?? data.today}" /></label>
			<label>Expected last night<input name="ends" type="date" required value="${v.ends ?? ''}" /></label></div>
			<label data-check><input type="checkbox" name="consent" value="yes" required ${v.consent === 'yes' ? html`checked` : html``} /> I took this photo, may share it, and confirm this is a public viewing location.</label>
			<button>Publish sighting ✦</button><p role="status" data-upload-status></p>
		</form>`}
	</section>`;
}
/** @param {LightsData} data */
function routeForm(data) {
	const f = data.filters, v = data.values ?? {};
	return html`<section aria-label="Plan a drive" data-panel><p data-eyebrow>A scenic way home</p><h2>Less planning.<br />More oohs &amp; aahs.</h2><p>A loop from your starting point, past current lights, and back again.</p>
		<form action="${paths.lightsfinder}" method="get" aria-label="Plan a lights loop" data-location-form>
			<input type="hidden" name="view" value="route" /><input type="hidden" name="plan" value="1" />
			<label>Holiday<select name="holiday" aria-label="Holiday">${holidayOptions(f.holiday)}</select></label><label>Other holiday name (optional)<input name="customHoliday" maxlength="100" /></label><input name="season" type="hidden" value="${f.season}" />
			<div data-fields><label>Starting latitude<input name="lat" type="number" step="any" min="-85" max="85" required value="${v.lat ?? f.lat}" /></label>
			<label>Starting longitude<input name="lon" type="number" step="any" min="-180" max="180" required value="${v.lon ?? f.lon}" /></label></div>
			<button type="button" data-locate hidden>Use my location</button><p role="status" data-location-status></p>
			<div data-fields><label>Maximum distance (km)<input name="km" type="number" min="1" max="100" required value="${v.km ?? '20'}" /></label>
			<label>Maximum driving time (minutes)<input name="minutes" type="number" min="5" max="240" required value="${v.minutes ?? '45'}" /></label></div>
			<label>My kind of adventure<select name="preference"><option value="most" ${v.preference !== 'best' ? html`selected` : html``}>As many lights as possible</option><option value="best" ${v.preference === 'best' ? html`selected` : html``}>Highest rated lights first</option></select></label>
			<button>Make my lights loop ↗</button>
		</form><p>Road distances include the return trip. Driving time excludes stops and live traffic. Up to 8 distinct addresses per loop; this is a suggested route, not a guaranteed optimum. Routing sends coordinates to the public OSRM service.</p>
	</section>`;
}
/** @param {LightsData} data */
function circuit(data) {
	if (data.routeMessage) { return html`<p role="status">${data.routeMessage}</p>`; }
	const route = data.circuit;
	if (!route) { return html``; }
	return html`<section aria-label="Your lights loop" data-panel><h2>Your lights loop</h2>
		<p data-metrics><strong>${route.posts.length}</strong> light stops · <strong>${(route.distance / 1000).toFixed(1)} km</strong> · <strong>${Math.ceil(route.duration / 60)} min</strong></p>
		<ol>${route.posts.map((p) => html`<li><a href="${lightsHref(data.filters, { post: p.id })}">${p.title}</a> — ${p.address}</li>`)}<li>Return to your starting point</li></ol>
		<a data-button href="${route.navigation}" target="_blank" rel="noopener">Open driving directions ↗</a>
		<p>Your navigation app may change the route and distance. Follow posted signs.</p>
		<details><summary>Turn-by-turn road directions</summary><ol>${route.steps.map((s) => html`<li>${s}</li>`)}</ol></details>
	</section>`;
}
/** @param {LightsData} data */
function awards(data) {
	const f = data.filters, rows = data.standings ?? [];
	const winner = rows.filter((p) => p.votes >= 3)[0];
	// Close only after the latest listed display ends; rankings remain transparent about mutable community data.
	const closed = rows.length > 0 && rows.every((p) => p.season_end < data.today) && f.season < new Date(data.today).getUTCFullYear();
	return html`<section aria-label="Season awards" data-panel><p data-eyebrow>For the neighborhood legends</p><h2>The glow of the season.</h2>
		<p>Celebrate the people who make the long way home worth it.</p>
		<form action="${paths.lightsfinder}" method="get" aria-label="Award region"><input type="hidden" name="view" value="awards" />
			<div data-fields><label>Holiday<select name="holiday" aria-label="Holiday">${holidayOptions(f.holiday)}</select></label>
			<label>Season<input name="season" type="number" min="2000" max="${new Date(data.today).getUTCFullYear() + 1}" value="${f.season}" required /></label>
			<label>Award scope<select name="scope">${['county', 'state', 'country'].map((s) => html`<option value="${s}" ${s === f.scope ? html`selected` : html``}>${s}</option>`)}</select></label></div>
			<label>Other holiday name (optional)<input name="customHoliday" maxlength="100" /></label><label>Region name<input name="region" maxlength="100" required value="${f.region}" placeholder="e.g. King County" /></label><div data-fields><label>Country of region (for county/state)<input name="countryRegion" maxlength="100" value="${f.countryRegion}" /></label><label>State of county (for county)<input name="stateRegion" maxlength="100" value="${f.stateRegion}" /></label></div><button>Show standings ✦</button>
		</form>
		${winner ? html`<aside data-award><span aria-hidden="true">🏆</span><p data-eyebrow>${closed ? 'Community season award' : 'Current frontrunner'} · ${f.region} · ${f.season}</p><h3>${winner.address}</h3><p>★ ${winner.average.toFixed(1)} · ${winner.votes} distinct voters</p></aside>` : html`<p>No award yet. An address needs at least 3 distinct voters to qualify.</p>`}
		<p>Addresses are grouped by normalized street address and region. Each verified account gets one averaged vote per address. Ranking blends ratings with a 3-star prior of 5 votes, then breaks ties by voter count and address. Live standings become community awards after the calendar year and all listed displays have ended. Region names are community supplied; results can change with moderation and late historical posts.</p>
		<ol aria-label="Award standings">${rows.map((p) => html`<li><a href="${lightsHref(f, { view: 'explore', post: p.id })}">${p.address}</a> · ★ ${p.average.toFixed(1)} · ${p.votes} voters · ${p.posts} posts</li>`)}</ol>
	</section>`;
}
/** @param {LightsData} data */
function moderation(data) {
	if (!data.user?.is_owner) { return html``; }
	return html`<section aria-label="Moderation queue" data-panel><h2>Moderation queue</h2><p>Review reports and restore, mark taken down, or hide posts. Resolving clears their reports.</p>
		${(data.queue ?? []).map((p) => html`<article aria-label="Review ${p.title}"><h3>${p.title}</h3><img src="${paths.lightsfinder}?photo=${p.photo_id}" alt="${p.title} under review" width="320" height="210" loading="lazy" /><p>${p.description}</p><p>${p.address} · ${p.status} · ${p.spam_reports} spam reports · ${p.gone_reports} taken-down reports</p>
			<form action="${paths.lightsfinder}" method="post"><input type="hidden" name="action" value="moderate" /><input type="hidden" name="id" value="${p.id}" />
				<label>Decision for ${p.title}<select name="status"><option value="active">Restore</option><option value="gone">Taken down</option><option value="hidden">Hide spam</option></select></label><button>Resolve report</button>
			</form></article>`)}
		${data.queue?.length ? html`` : html`<p>No reports waiting.</p>`}
	</section>`;
}

/** Single fragment code path for full documents and enhanced responses. @param {LightsData} data */
export function lightsfinderFragment(data) {
	const f = data.filters, holiday = holidays.find((h) => h.id === f.holiday) ?? { ...holidays.at(-1), id: f.holiday, name: f.holiday.startsWith('custom:') ? f.holiday.slice(7) : 'Other holiday', icon: '🏮', theme: 'other' };
	return html`<article data-lightsfinder data-theme="${holiday.theme}">
		<nav aria-label="Lightsfinder navigation"><a href="${paths.lightsfinder}" data-brand>✦ lightsfinder<span>take the scenic route</span></a><div>
			<a href="${lightsHref(f, { view: 'explore' })}" ${f.view === 'explore' ? html`aria-current="page"` : html``}>Explore</a>
			<a href="${lightsHref(f, { view: 'route' })}" ${f.view === 'route' ? html`aria-current="page"` : html``}>Plan a drive</a>
			<a href="${lightsHref(f, { view: 'awards' })}" ${f.view === 'awards' ? html`aria-current="page"` : html``}>Season awards</a>
			<a href="${lightsHref(f, { view: 'share' })}" data-button>＋ Share lights</a></div>
		</nav>
		<header data-hero><div><p data-eyebrow>${holiday.icon} ${holiday.name} ${f.season} · Let there be delight</p><h1>Lightsfinder</h1><h2>A little detour.<br /><em>A lot of delight.</em></h2><p>Find the houses that go all out. Share a little sparkle.<br />Make a night of the lights around you.</p></div>
			<div data-illustration aria-hidden="true"><span>${holiday.icon}</span><svg viewBox="0 0 360 210"><path d="M18 185 Q180 130 342 185" fill="none" stroke="currentColor" stroke-width="3"/><path d="M82 104L155 40L226 104V183H82Z" fill="${holiday.id === 'christmas' ? '#235e48' : holiday.id === 'valentine' ? '#923657' : '#5d3676'}" stroke="#302039" stroke-width="5"/><path d="M64 105L155 26L245 105" fill="none" stroke="#302039" stroke-width="9"/><rect x="144" y="128" width="35" height="55" rx="16" fill="#ffd275"/><rect x="99" y="107" width="29" height="32" fill="#ffce71"/><rect x="192" y="107" width="20" height="32" fill="#ffce71"/><path d="M67 102Q154 130 243 102M90 75Q154 100 215 76" fill="none" stroke="#ffe2a2" stroke-width="3"/><g fill="#daf082"><circle cx="88" cy="108" r="6"/><circle cx="113" cy="114" r="6"/><circle cx="145" cy="118" r="6"/><circle cx="178" cy="117" r="6"/><circle cx="210" cy="111" r="6"/><circle cx="111" cy="85" r="5"/><circle cx="142" cy="92" r="5"/><circle cx="174" cy="92" r="5"/><circle cx="201" cy="83" r="5"/></g><path d="M278 83L245 152H265L244 176H315L293 152H311Z" fill="#8e9b67" stroke="#302039" stroke-width="3"/>${holiday.id === 'halloween' ? html`<g fill="#ffad5a"><circle cx="46" cy="166" r="19"/><circle cx="74" cy="178" r="13"/></g><g fill="#302039"><path d="M34 166l7-7 4 9M49 168l4-9 6 8M39 175q8 8 15 0"/></g><path d="M46 146v-10M74 163v-9" stroke="#302039" stroke-width="4"/>` : holiday.id === 'christmas' ? html`<g fill="#cb4b43" stroke="#fff5d8" stroke-width="3"><rect x="26" y="151" width="32" height="30" rx="3"/><rect x="59" y="160" width="22" height="22" rx="3"/><path d="M42 150v32M26 162h32M70 160v22"/></g>` : html`<g fill="#ffd275"><path d="M42 143l6 13 14 2-10 10 2 14-12-7-12 7 2-14-10-10 14-2Z"/><circle cx="73" cy="170" r="7"/></g>`}<g fill="#fff5d8"><path d="M274 31l3 10 10 3-10 3-3 10-3-10-10-3 10-3Z"/><path d="M36 58l3 9 9 3-9 3-3 9-3-9-9-3 9-3Z"/></g></svg><p>big lights. little adventures.</p></div>
		</header>
		${data.error ? html`<p role="alert">${data.error}</p>` : html``}${data.notice ? html`<p role="status">${data.notice}</p>` : html``}
		${data.user ? html`<p data-account>${data.user.is_owner ? html`<a href="${lightsHref(f, { view: 'moderation' })}">Review reports</a>` : html``}</p>` : html``}
		${f.view === 'share' ? shareForm(data) : f.view === 'awards' ? awards(data) : f.view === 'moderation' ? moderation(data) : html`
			<div data-explorer><aside>${f.view === 'route' ? routeForm(data) : html`<p data-eyebrow>Out there, glowing</p><h2>Find your kind of magic.</h2>${search(data)}<aside data-tip><span aria-hidden="true">${holiday.icon}</span><p><strong>Make someone’s night.</strong><br />Found a brilliant display? Add it to the map for the next explorer.</p><a href="${lightsHref(f, { view: 'share' })}">Share a sighting ↗</a></aside>`}</aside>${map(data)}</div>
			${circuit(data)}
			<section aria-label="Nearby sightings"><div data-section-heading><h2>${data.selected ? 'A closer look' : 'Follow the glow'}</h2><p>Fresh sightings &amp; neighborhood favorites</p></div>
			${data.truncated ? html`<p role="status">Showing the first 500 sightings. Narrow your radius to see more.</p>` : html``}
			${data.selected ? card(data.selected, data, true) : data.posts.length ? html`<ol data-sightings>${data.posts.map((p) => html`<li>${card(p, data)}</li>`)}</ol>` : html`<div data-empty><span aria-hidden="true">✧</span><h3>The map is waiting for its first sparkle.</h3><p>No current sightings match this area and season. Try another location, include past seasons, or be the first to share.</p><a data-button href="${lightsHref(f, { view: 'share' })}">Put some magic on the map</a></div>`}
			</section>`}
		<footer><p>✦ A brighter neighborhood starts with you.</p><p>View from public streets. Respect neighbors. Historical spots are guesses, not confirmed displays.</p>${installControls('Lightsfinder')}<p><a href="${paths.apps}">All apps</a> · <a href="${paths.lightsfinder}">Upcoming holiday</a></p></footer>
	</article>`;
}
/** @param {LightsData} data */
export function lightsfinder(data) {
	return layout({ viewTransitions: false, title: 'Lightsfinder — Find your next little adventure', path: paths.lightsfinder, app: 'lightsfinder', user: data.account,
		description: 'Discover holiday lights, share photo sightings, and plan a scenic driving loop through your neighborhood.',
		head: html`<link rel="manifest" href="/apps/lightsfinder/manifest.json" /><meta name="theme-color" content="#593475" /><link rel="apple-touch-icon" href="/apps/lightsfinder/icon-192.png" /><link rel="stylesheet" href="/apps/lightsfinder/styles.css" />`,
		body: lightsfinderFragment(data), scripts: html`<script type="module" src="/apps/lightsfinder/app.js"></script>` });
}
