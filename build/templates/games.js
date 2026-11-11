import { html } from '../../shared/html.js';
import { layout } from '../../shared/templates/layout.js';
import { gameTiles } from '../shared/game-tiles.js';
import { paths } from '../../shared/routes.js';
/** @import { Social } from '../../shared/data/atproto.js' */
const assets = '/games/aether-wing';
const head = html`<link rel="stylesheet" href="/components/retro-game/styles.css">
	<link rel="stylesheet" href="/games/aether-wing/styles.css">`;

/** @param {string} prefix @param {string} name @param {number} factor @param {number} [drift] */
function background(prefix, name, factor, drift = 0.05) {
	const map = gameTiles[name];
	return html`<retro-tileset id="${prefix}-${name}" tile-width="16" tile-height="16"><img src="${assets}/${name}-tiles.png" alt=""></retro-tileset>
		<retro-layer factor="${factor}" drift="${drift}"><retro-tilemap tileset="${prefix}-${name}" columns="${map.columns}" rows="${map.rows}" style="--sheet-columns:16;--sheet-rows:${Math.ceil((Math.max(...map.tiles) + 1) / 16)}">${map.tiles.map((index) => { return html`<retro-tile index="${index}" style="background-image:url('${assets}/${name}-tiles.png')"></retro-tile>`; })}</retro-tilemap></retro-layer>`;
}

/** @param {string} prefix @param {number} index @param {string} colors @param {number} size @param {number} rate */
function ground(prefix, index, colors, size, rate) {
	const palette = `${prefix}-palette-${index}`;
	const style = colors.split(' ').map((color, slot) => { return `--palette-${slot}:${color}`; }).join(';');
	return html`<retro-palette id="${palette}" colors="${colors}" cycle-start="2" cycle-rate="${rate}"></retro-palette>
		<retro-layer mode="perspective" cell-size="${size}" style="${style};--cycle-rate:${rate}">
			<retro-tilemap palette="${palette}" tileset="${prefix}-ground" columns="2" rows="2">
				<retro-tile index="0"></retro-tile><retro-tile index="1"></retro-tile><retro-tile index="1"></retro-tile><retro-tile index="0"></retro-tile>
			</retro-tilemap>
		</retro-layer>`;
}

/** An ordinary HTML definition is also the console interpreter's input.
 * @param {boolean} [demonstration] A short, reproducible combat course for the component docs.
 */
export function worldMarkup(demonstration = false) {
	const prefix = demonstration ? 'training' : 'aether';
	const stages = demonstration ? html`
		<retro-stage id="training-sector" data-stage-index="0" name="Training range" length="120" speed="12" sky="#213959" haze="#b0d5ce">
			${background(prefix, 'reach-mountains', 0.15)}
			${ground(prefix, 1, '#296b72 #48a99a #81cfb3 #b8e8c5', 4, 5)}
			<retro-sprite actor="scenery" aspect="0.666667" tileset="${prefix}-pine" x="-4" size="4" spacing="16"><img src="${assets}/pine.png" alt=""></retro-sprite>
			<retro-sprite actor="scenery" aspect="0.666667" tileset="${prefix}-pine" x="4" size="4" spacing="16" offset="8"><img src="${assets}/pine.png" alt=""></retro-sprite>
			<retro-sprite actor="enemy" frames="8" fps="10" tileset="${prefix}-moth" at="8" interval="30" count="4" x="0" y="1.1" z="32" behavior="straight"
				health="1" score="100" fire-rate="1.1" fire-delay="0.2" shot-speed="24"><label data-native-target><input type="checkbox" aria-label="Shoot moth"><span><img src="${assets}/moth.png" alt=""></span></label></retro-sprite>
		<div data-native-cleared>Sector cleared. Choose the next sector.</div></retro-stage>` : html`
		<retro-stage id="emerald-reach" data-stage-index="0" name="Emerald Reach" length="480" speed="18" sky="#172d50" haze="#93c9bd" draw-distance="100">
			${background(prefix, 'reach-clouds', 0.06, 0.02)}
			${background(prefix, 'reach-mountains', 0.18, 0.04)}
			${background(prefix, 'reach-forest', 0.48, 0.1)}
			${ground(prefix, 2, '#265c67 #398f85 #64c2a1 #a7debd', 4, 5)}
			<retro-sprite actor="scenery" aspect="0.666667" tileset="${prefix}-pine" x="-4.2" size="4.8" spacing="18"><img src="${assets}/pine.png" alt=""></retro-sprite>
			<retro-sprite actor="scenery" aspect="0.666667" tileset="${prefix}-pine" x="4.4" size="5.5" spacing="23" offset="8"><img src="${assets}/pine.png" alt=""></retro-sprite>
			<retro-sprite actor="scenery" aspect="0.666667" frames="8" fps="8" tileset="${prefix}-crystal" x="-7" size="3" spacing="38" offset="15"><img src="${assets}/crystal.png" alt=""></retro-sprite>
			<retro-sprite actor="enemy" frames="8" fps="10" tileset="${prefix}-moth" at="32" interval="45" count="10" behavior="sine" x="0" spread="1.1" y="1.2"
				z="60" sway="0.7" frequency="1.8" health="1" fire-rate="2.4" fire-delay="1.2" score="100"><label data-native-target><input type="checkbox" aria-label="Shoot moth"><span><img src="${assets}/moth.png" alt=""></span></label></retro-sprite>
		<div data-native-cleared>Sector cleared. Choose the next sector.</div></retro-stage>
		<retro-stage id="amber-expanse" data-stage-index="1" name="Amber Expanse" length="570" speed="22" sky="#473951" haze="#eab899" repair="1" draw-distance="110">
			${background(prefix, 'dunes-clouds', 0.08, 0.02)}
			${background(prefix, 'dunes-mountains', 0.22, 0.05)}
			${background(prefix, 'dunes-forest', 0.5, 0.12)}
			${ground(prefix, 3, '#825658 #b17c65 #e1aa7a #f7d59c', 5, 7)}
			<retro-sprite actor="scenery" aspect="0.666667" frames="8" fps="8" tileset="${prefix}-crystal" x="-3.8" size="4" spacing="18"><img src="${assets}/crystal.png" alt=""></retro-sprite>
			<retro-sprite actor="scenery" aspect="0.666667" frames="8" fps="8" tileset="${prefix}-crystal" x="4.5" size="5.5" spacing="25" offset="12"><img src="${assets}/crystal.png" alt=""></retro-sprite>
			<retro-sprite actor="enemy" frames="8" fps="10" tileset="${prefix}-scarab" at="15" interval="34" count="16" behavior="dive" x="0" spread="1.4" y="2.7"
				z="65" dive-rate="0.55" sway="0.5" health="2" speed="2" fire-rate="1.5" fire-delay="0.6" shot-speed="20" score="200"><label data-native-target><input type="checkbox" aria-label="Shoot scarab"><span><img src="${assets}/scarab.png" alt=""></span></label></retro-sprite>
			<retro-sprite actor="enemy" frames="8" fps="10" tileset="${prefix}-moth" at="110" interval="100" count="4" behavior="sine" x="0" y="0.8" z="70"
				sway="2" health="1" fire-rate="2" score="100"><label data-native-target><input type="checkbox" aria-label="Shoot moth"><span><img src="${assets}/moth.png" alt=""></span></label></retro-sprite>
		<div data-native-cleared>Sector cleared. Choose the next sector.</div></retro-stage>
		<retro-stage id="violet-citadel" data-stage-index="2" name="Violet Citadel" length="660" speed="25" sky="#191e42" haze="#9e8dba" repair="1" draw-distance="120">
			${background(prefix, 'citadel-clouds', 0.05, 0.03)}
			${background(prefix, 'citadel-mountains', 0.2, 0.06)}
			${background(prefix, 'citadel-forest', 0.6, 0.15)}
			${ground(prefix, 4, '#4b527d #7472ad #a295cc #d7c3ea', 3.5, 9)}
			<retro-sprite actor="scenery" aspect="0.666667" frames="8" fps="6" tileset="${prefix}-tower" x="-4.8" size="6" spacing="22"><img src="${assets}/tower.png" alt=""></retro-sprite>
			<retro-sprite actor="scenery" aspect="0.666667" frames="8" fps="6" tileset="${prefix}-tower" x="4.8" size="6" spacing="22" offset="11"><img src="${assets}/tower.png" alt=""></retro-sprite>
			<retro-sprite actor="scenery" aspect="0.666667" frames="8" fps="8" tileset="${prefix}-crystal" x="8" size="7" spacing="60"><img src="${assets}/crystal.png" alt=""></retro-sprite>
			<retro-sprite actor="enemy" frames="8" fps="10" tileset="${prefix}-sentinel" at="12" interval="32" count="20" behavior="chase" x="0" spread="2" y="1.5"
				z="72" tracking="0.7" health="3" speed="4" fire-rate="1.15" fire-delay="0.5" shot-speed="24" score="300"><label data-native-target><input type="checkbox" aria-label="Shoot sentinel"><span><img src="${assets}/sentinel.png" alt=""></span></label></retro-sprite>
			<retro-sprite actor="enemy" frames="8" fps="10" tileset="${prefix}-scarab" at="120" interval="75" count="7" behavior="dive" x="0" spread="1.5" y="3"
				z="80" dive-rate="0.7" health="2" fire-rate="1.4" shot-speed="24" score="200"><label data-native-target><input type="checkbox" aria-label="Shoot scarab"><span><img src="${assets}/scarab.png" alt=""></span></label></retro-sprite>
		<div data-native-cleared>Sector cleared. Choose the next sector.</div></retro-stage>`;
	return html`<retro-game>
	<retro-world aria-label="${demonstration ? 'Flight demonstration' : 'Aether Wing game'}">
		<retro-tileset id="${prefix}-pilot" tile-width="32" tile-height="32"><img src="${assets}/pilot.png" alt=""></retro-tileset>
		<retro-tileset id="${prefix}-moth" tile-width="32" tile-height="32"><img src="${assets}/moth.png" alt=""></retro-tileset>
		<retro-tileset id="${prefix}-scarab" tile-width="32" tile-height="32"><img src="${assets}/scarab.png" alt=""></retro-tileset>
		<retro-tileset id="${prefix}-sentinel" tile-width="32" tile-height="32"><img src="${assets}/sentinel.png" alt=""></retro-tileset>
		<retro-tileset id="${prefix}-pine" tile-width="32" tile-height="48"><img src="${assets}/pine.png" alt=""></retro-tileset>
		<retro-tileset id="${prefix}-crystal" tile-width="32" tile-height="48"><img src="${assets}/crystal.png" alt=""></retro-tileset>
		<retro-tileset id="${prefix}-tower" tile-width="32" tile-height="48"><img src="${assets}/tower.png" alt=""></retro-tileset>
		<retro-tileset id="${prefix}-ground" tile-width="8" tile-height="8">
			<retro-tile index="0">3 3 3 3 3 3 3 3
3 0 0 0 0 0 0 0
3 0 0 0 0 0 0 0
3 0 0 0 0 0 0 0
3 0 0 0 0 0 0 0
3 0 0 0 0 0 0 0
3 0 0 0 0 0 0 0
3 0 0 0 0 0 0 0</retro-tile>
			<retro-tile index="1">3 3 3 3 3 3 3 3
3 1 1 1 1 1 1 1
3 1 1 1 1 1 1 1
3 1 1 1 1 1 1 1
3 1 1 1 1 1 1 1
3 1 1 1 1 1 1 1
3 1 1 1 1 1 1 1
3 1 1 1 1 1 1 1</retro-tile>
		</retro-tileset>
		<retro-input deadzone="0.18" fire-button="0">
			<form>
				<fieldset data-native-controls><legend>Course controls</legend>
					<label><input type="checkbox" data-native-run>Run course</label>
					<label><input type="checkbox" data-native-pause>Pause motion</label>
				</fieldset>
				<fieldset data-native-controls><legend>Move horizontally</legend>
					<label><input type="radio" name="${prefix}-x" data-axis="x" value="-1">Left</label>
					<label><input type="radio" name="${prefix}-x" data-axis="x" value="0" checked>Center</label>
					<label><input type="radio" name="${prefix}-x" data-axis="x" value="1">Right</label>
				</fieldset>
				<fieldset data-native-controls><legend>Move vertically</legend>
					<label><input type="radio" name="${prefix}-y" data-axis="y" value="1">Up</label>
					<label><input type="radio" name="${prefix}-y" data-axis="y" value="0" checked>Middle</label>
					<label><input type="radio" name="${prefix}-y" data-axis="y" value="-1">Down</label>
				</fieldset>
				<fieldset data-native-controls><legend>Sector</legend>
					${demonstration ? html`<label><input type="radio" name="${prefix}-stage" data-stage-choice="0" checked>Training range</label>` : html`
						<label><input type="radio" name="${prefix}-stage" data-stage-choice="0" checked>Emerald Reach</label>
						<label><input type="radio" name="${prefix}-stage" data-stage-choice="1">Amber Expanse</label>
						<label><input type="radio" name="${prefix}-stage" data-stage-choice="2">Violet Citadel</label>`}
				</fieldset>
				<retro-screen data-world-viewport width="320" height="200" tabindex="0" role="group" aria-label="${demonstration ? 'Training world viewport' : 'Aether Wing world viewport'}">
					${stages}
					<retro-sprite actor="player" tileset="${prefix}-pilot" frames="5" fps="0" max-health="${demonstration ? 3 : 7}" speed="3.2" radius="0.18"
				size="0.8" fire-rate="0.14" shot-speed="75" recovery="1.2" start-x="0" start-y="1.1"><img src="${assets}/pilot.png" alt=""></retro-sprite>
				</retro-screen>
				<p data-native-controls>Run the course, steer with the radio controls, and select an approaching enemy to shoot. Clear the targets in each sector.</p>
				<button type="reset" data-native-controls>Reset course</button>
				<p data-native-victory role="status">All sectors cleared.</p>
				<div data-world-hud aria-label="Flight instruments">
					<label>Shield <output data-world-shield aria-label="Shield" aria-live="off">${demonstration ? 3 : 7}</output></label>
					<label>Score <output data-world-score aria-label="Score" aria-live="off">000000</output></label>
					<label>Sector <output data-world-sector aria-label="Sector" aria-live="off">${demonstration ? 'Training range' : 'Emerald Reach'}</output></label>
					<label>Route <output data-world-progress aria-label="Route progress" aria-live="off">0%</output></label>
				</div>
				<p role="status" aria-label="Flight status" data-world-status>Run the course and select an approaching target to shoot.</p>
				<div data-world-controls role="group" aria-label="Game controls">
					<button type="button" data-action="start" disabled>Launch</button>
					<button type="button" data-action="pause" disabled>Pause</button>
					<button type="button" data-action="restart" disabled>Restart flight</button>
				</div>
				<div data-world-controls role="group" aria-label="Flight controls">
					<button type="button" data-action="left" aria-label="Fly left" disabled>←</button>
					<button type="button" data-action="up" aria-label="Fly up" disabled>↑</button>
					<button type="button" data-action="down" aria-label="Fly down" disabled>↓</button>
					<button type="button" data-action="right" aria-label="Fly right" disabled>→</button>
					<button type="button" data-action="fire" disabled>Fire</button>
				</div>
				<p data-world-controller>Keyboard / touch</p>
			</form>
		</retro-input>
	</retro-world>
</retro-game>`;
}

/** @param {Social} [social] */
export function games(social) {
	return layout({ social, head, path: paths.games, title: 'Games',
		description: 'Original browser games built with HTML retro game components.',
		body: html`<article data-games>
			<p>Made with retro game elements</p><h1>Games</h1>
			<p>Small worlds, built in HTML.</p>
			<section aria-labelledby="aether-card">
				<a href="${paths.aetherWing}"><img src="${assets}/cover.png" width="640" height="400" alt="Fly Aether Wing above a perspective grid."></a>
				<h2 id="aether-card"><a href="${paths.aetherWing}">Aether Wing</a></h2>
				<p>A forward-scrolling arcade shooter. Fly through forests, crystal dunes, and an enemy citadel. Dodge incoming fire and clear all three sectors.</p>
				<p>Keyboard · Touch · Gamepad</p>
				<a href="${paths.retroGame}">Build a game with these components</a>
			</section>
		</article>` });
}

/** @param {Social} [social] */
export function aetherWing(social) {
	return layout({ social, head, path: paths.aetherWing, title: 'Aether Wing',
		description: 'An original faux 3D arcade shooter with palette-cycled ground, rotating sprites, and three HTML-authored stages.',
		scripts: html`<script type="module" src="/components/retro-game/index.js"></script>`,
		body: html`<article data-aether-wing>
			<p><a href="${paths.games}">Games</a> / Aether Wing</p>
			<h1>Aether Wing</h1>
			<p>Through the forest. Beyond the dunes. Into the citadel.</p>
			${worldMarkup()}
			<details open><summary>How to play</summary>
				<p>Move with the arrow keys or WASD. Hold Space to fire. Use P or Escape to pause. On a touch screen, hold the direction and Fire buttons together.</p>
				<p>Connect a gamepad and press a button. The first controller detected takes player one. Use the left stick or directional pad to fly, the bottom face button or right trigger to shoot, and Start to pause or resume. The bottom face button also launches a flight. Disconnecting returns control to the keyboard and touch buttons.</p>
				<p>Avoid enemies and their pink projectiles. Every hit costs one shield point and grants a short recovery interval. Destroy enemies for points. Reach the end of all three sectors to win. Each new sector restores one shield point.</p>
			</details>
			<section aria-label="Flight route"><h2>Three sectors</h2>
				<ol><li><strong>Emerald Reach</strong> — pine forests and swaying moth drones.</li>
				<li><strong>Amber Expanse</strong> — rotating crystals and diving scarabs with heavier armor.</li>
				<li><strong>Violet Citadel</strong> — towers and sentinels that track your position and fire faster.</li></ol>
			</section>
			<p><a href="${paths.retroGame}#world">See the HTML and build your own flight</a></p>
		</article>` });
}
