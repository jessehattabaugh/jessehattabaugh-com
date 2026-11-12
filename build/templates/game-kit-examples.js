import { html } from '../../shared/html.js';
import { paths } from '../../shared/routes.js';
import { aetherWingArt as art, background, reachSceneryExcerpt, runway, worldMarkup } from './games.js';

/** @import { Raw } from '../../shared/html.js' */
/** @import { gameKitElements } from '../../shared/routes.js' */
/** @typedef {{ title: string, text: string, markup: Raw, controls?: Raw }} Example */
/** @typedef {{ title: string, summary: Raw, examples: Example[], tutorial?: Example }} Lesson */

/** @param {string} label @param {string} target @param {string} attribute @param {number} value @param {number} max @param {number} [min] @param {number} [step] */
function slider(label, target, attribute, value, max, min = 0, step = 1) {
	return html`<label hidden>${label}
	<input type="range" data-game-for="${target}" name="${attribute}" value="${value}" min="${min}" max="${max}" step="${step}">
</label>`;
}

/** @param {string} event */
function status(event) {
	return html`<p role="status" aria-label="${event} event" data-game-event="${event}" hidden></p>`;
}

/** @param {number} width @param {number} height @param {string} [style] */
function screen(width, height, style = '') {
	return html`<game-screen width="${width}" height="${height}" role="img"
	aria-label="${width} by ${height} pixel viewport"${style ? html` style="${style}"` : html``}></game-screen>`;
}

/** @param {string} title @param {string} text @param {Raw} markup @param {Raw} [controls] @returns {Example} */
function example(title, text, markup, controls) {
	return { title, text, markup, controls };
}

const pilot = html`<game-sprite x="144" y="142" width="32" height="32" style="overflow:hidden">
	<img src="${art}/pilot.png" alt="Aether Wing pilot"
		style="width:500%;max-width:none;transform:translateX(-40%)">
</game-sprite>`;

/** @param {string} prefix */
function reachHorizon(prefix) {
	const preview = { overscan: true, excerpt: reachSceneryExcerpt };
	return html`${background(prefix, 'reach-mountains', 0.25, 0.04, { ...preview, label: 'Emerald Reach mountains' })}
	${background(prefix, 'reach-forest', 1, 0.1, { ...preview, label: 'Emerald Reach forest' })}`;
}

const plane = example('Parallax layers', 'Move the camera to see the Emerald Reach forest travel four times as far as the mountains. The tilemaps extend past the screen so scrolling can reveal more scenery.', html`<game-screen id="parallax-camera" width="128" height="96" camera-x="0">
	${reachHorizon('parallax-camera')}
</game-screen>`, slider('Camera position', 'parallax-camera', 'camera-x', 0, 64));

/** @param {string} id @param {string} mode */
function bitmap(id, mode) {
	return html`<game-screen${mode === 'road' ? html` style="--game-screen-background:linear-gradient(#191e42 33.33%, #4b527d 33.33%)"` : html``}>
	<game-layer id="${id}" mode="${mode}" amplitude="12">
		<img src="${runway.src}" width="${runway.width}" height="${runway.height}" alt="Violet Citadel runway texture">
	</game-layer>
</game-screen>`;
}

const flatMap = example('Tilemap', 'The map fills the screen. Cells appear in row-major order, from left to right and then top to bottom.', html`<game-screen width="64" height="32">
	<game-tilemap columns="4" rows="2" role="img" aria-label="Two rows of wall and floor tiles">
		<span style="background:#263956"></span><span style="background:#263956"></span>
		<span style="background:#79b5ad"></span><span style="background:#263956"></span>
		<span style="background:#79b5ad"></span><span style="background:#79b5ad"></span>
		<span style="background:#79b5ad"></span><span style="background:#263956"></span>
	</game-tilemap>
</game-screen>`);

const atlas = example('Read a bitmap pattern bank', 'The bank describes a single row of five 32 × 32 pilot frames. The map reads frames 0, 2, and 4 from the same image using CSS background positions. The visible image inside the bank is useful when inspecting an atlas.', html`<game-tileset id="pilot-bank" tile-width="32" tile-height="32" style="display:block">
	<img src="${art}/pilot.png" width="160" height="32" alt="Pilot frame sheet">
</game-tileset>
<game-screen width="96" height="32">
	<game-tilemap tileset="pilot-bank" columns="3" rows="1" style="--sheet-columns:5"
		role="img" aria-label="Left, center, and right pilot frames">
		<game-tile index="0" style="background-image:url('${art}/pilot.png')"></game-tile>
		<game-tile index="2" style="background-image:url('${art}/pilot.png')"></game-tile>
		<game-tile index="4" style="background-image:url('${art}/pilot.png')"></game-tile>
	</game-tilemap>
</game-screen>`);

const palette = example('Preview the ground palette', 'These are the four Emerald Reach colors. The first two fill alternating ground tiles and the last two alternate on the grid lines. The palette element records the indices and cycle rate. Aether Wing also assigns those colors to CSS properties on the ground layer.', html`<game-palette id="reach-colors" colors="#265c67 #398f85 #64c2a1 #a7debd"
	cycle-start="2" cycle-rate="5"></game-palette>
<game-screen width="128" height="24">
	<game-tilemap palette="reach-colors" columns="4" rows="1" role="img" aria-label="Emerald Reach palette swatches">
		<game-tile index="0" style="background:#265c67"></game-tile>
		<game-tile index="1" style="background:#398f85"></game-tile>
		<game-tile index="2" style="background:#64c2a1"></game-tile>
		<game-tile index="3" style="background:#a7debd"></game-tile>
	</game-tilemap>
</game-screen>`);

const world = example('Fly the training course', 'Launch, steer, and fire. With scripting disabled, use Run course, the native direction controls, and the target checkbox. The training sector uses the same projection and collision rules as Aether Wing. Pause and resume to inspect the scene, or restart to reset score and health.', worldMarkup(true));

const flow = example('Scene switching', 'Follow a fragment link to switch scenes. Browser Back returns to the previous scene.', html`<game-flow start="demo-dock">
	<game-scene id="demo-dock" data-start tabindex="-1">
		<h3>Dock</h3>
		<a href="#demo-bridge">Go to the bridge</a>
	</game-scene>
	<game-scene id="demo-bridge" tabindex="-1">
		<h3>Bridge</h3>
		<a href="#demo-dock">Return to the dock</a>
	</game-scene>
</game-flow>`, status('game-scene-change'));

const menu = example('Menu actions', 'Follow the links normally. With scripting enabled and a link focused, press 1 or 2 to choose a channel and see the emitted event.', html`<game-menu>
	<nav aria-label="Radio channels">
		<a href="#demo-weather" data-key="1">Weather</a>
		<a href="#demo-signal" data-key="2">Signal</a>
	</nav>
</game-menu>
<p id="demo-weather" tabindex="-1">Weather channel</p>
<p id="demo-signal" tabindex="-1">Signal channel</p>`, status('game-action'));

const modal = example('Modal dialog', 'Open the native dialog. Close it with the form button or Escape to return focus to the opener.', html`<button type="button" command="show-modal" commandfor="demo-inventory">Open inventory</button>
<game-modal>
	<dialog id="demo-inventory" aria-labelledby="inventory-title">
		<h3 id="inventory-title">Inventory</h3>
		<p>One spare battery.</p>
		<form method="dialog"><button autofocus>Close inventory</button></form>
	</dialog>
</game-modal>`, status('game-modal-change'));

/** @type {Record<typeof gameKitElements[number], Lesson>} */
export const lessons = {
	'game-screen': {
		title: 'Set the flight viewport',
		summary: html`Set <code>width="320"</code> and <code>height="200"</code> to establish Aether Wing’s logical resolution. The screen scales to fit and clips its children. Set <code>camera-x</code> and <code>camera-y</code> to offset its direct layers.`,
		examples: [
			example('Wide viewport', 'A wide screen for panoramic scenery.', screen(160, 48)),
			example('Square viewport', 'A square screen with a custom background and display width.', screen(96, 96, '--game-screen-background:#3c2854;--game-screen-width:12rem')),
			example('Portrait viewport', 'Logical dimensions establish a portrait aspect ratio.', screen(80, 128, '--game-screen-width:10rem')),
			plane,
		],
		tutorial: example('Aether Wing viewport', 'The viewport starts empty. Its background shows the area that the graphics will occupy.', screen(320, 200)),
	},
	'game-sprite': {
		title: 'Place the pilot',
		summary: html`Place a bitmap with <code>x</code> and <code>y</code>. The running world sets the player’s <code>z</code> depth and selects a bank <code>frame</code>. The player emits <code>game-shot</code> and <code>game-player-hit</code> during flight.`,
		examples: [
			example('Bitmap sprite', 'Scale the sprite from its top-left corner.', html`<game-screen width="128" height="64">
	<game-sprite id="sprite-pine" x="24" y="12" width="16" height="24" scale="2">
		<img src="${art}/pine.png" alt="Emerald Reach pine">
	</game-sprite>
</game-screen>`, slider('Pine scale', 'sprite-pine', 'scale', 2, 3, 0.5, 0.25)),
			example('Overlapping sprites', 'The moth paints above the mirrored tree because its priority is higher, even though it appears first in the markup. Ties follow document order. Perspective worlds use depth instead.', html`<game-screen width="128" height="64" role="group" aria-label="Sprite drawing order">
	<game-sprite id="priority-moth" x="42" y="24" width="28" height="28" priority="2" style="overflow:hidden">
		<img src="${art}/moth.png" alt="Priority moth" style="width:800%;max-width:none">
	</game-sprite>
	<game-sprite x="55" y="6" width="30" height="48" priority="1" flip-x>
		<img src="${art}/pine.png" alt="Mirrored pine">
	</game-sprite>
</game-screen>`, slider('Moth priority', 'priority-moth', 'priority', 2, 4, 0)),
			example('Sprites in a perspective world', 'Launch and steer to see the pilot bank. Scenery and enemies scale with distance, and their depth controls overlap.', world.markup),
		],
		tutorial: example('Pilot bitmap', 'Crop a single frame from the five-frame pilot image. The later world step uses the same sheet for banking.', html`<game-screen width="320" height="200">
	${pilot}
</game-screen>`),
	},
	'game-layer': {
		title: 'Build the horizon',
		summary: html`Use <code>factor</code> to give distant mountains and closer trees different scroll speeds. Aether Wing’s stage layers add <code>drift</code> and use <code>mode="perspective"</code> for the ground plane.`,
		examples: [
			example('Bitmap scrolling', 'Plain mode repeats the Violet Citadel runway texture. Change either scroll position in logical pixels.', bitmap('plain-runway', 'plain'), html`${slider('Horizontal scroll', 'plain-runway', 'scroll-x', 0, 64, -64)}${slider('Vertical scroll', 'plain-runway', 'scroll-y', 0, 64, -64)}`),
			plane,
			example('Affine rotation', 'Rotate and scale the whole repeating texture, a technique used in the SNES Mode 7 effect.', bitmap('affine-runway', 'affine'), html`${slider('Texture angle', 'affine-runway', 'angle', 0, 180)}${slider('Texture scale', 'affine-runway', 'scale', 1, 4, 0.25, 0.25)}`),
			example('Scanline offsets', 'Offset each horizontal row. Phase moves the wave through the texture.', bitmap('row-runway', 'scanlines'), slider('Scanline phase', 'row-runway', 'phase', 0, 360)),
			example('Column offsets', 'Offset each vertical column to make the lane markings appear to twist.', bitmap('column-runway', 'columns'), slider('Column phase', 'column-runway', 'phase', 0, 360)),
			example('Perspective road', 'Rows grow wider toward the bottom. Bend the road with phase and scroll the texture to move the lane markings. Violet Citadel uses the same bitmap on its CSS-projected ground.', bitmap('road-texture', 'road'), html`${slider('Road bend', 'road-texture', 'phase', 0, 360)}${slider('Road travel', 'road-texture', 'scroll-y', 0, 120)}`),
			example('Projected ground', 'Launch to see a CSS perspective plane and its palette cycle. The bitmap road mode above uses separate scanline rendering.', world.markup),
		],
		tutorial: example('The pilot and horizon', 'The layers scroll at different speeds as the camera moves. The pilot stays in front.', html`<game-screen id="pilot-camera" width="320" height="200" camera-x="0">
	${reachHorizon('pilot-camera')}
	${pilot}
</game-screen>`, slider('Pilot camera position', 'pilot-camera', 'camera-x', 0, 120)),
	},
	'game-tilemap': {
		title: 'Lay out the terrain',
		summary: html`Set <code>columns</code> and <code>rows</code> to arrange the ground in a grid. Aether Wing repeats a two-by-two ground map. Its scenery layers use larger maps that reference bitmap patterns.`,
		examples: [flatMap, example('Two-by-two terrain', 'Ordinary cells can carry colors or images. Fill a layer by sizing its map to match the viewport.', html`<game-screen width="80" height="48">
	<game-layer>
		<game-tilemap columns="2" rows="2" role="img" aria-label="Two-by-two terrain">
			<span style="background:#265c67"></span><span style="background:#398f85"></span>
			<span style="background:#398f85"></span><span style="background:#265c67"></span>
		</game-tilemap>
	</game-layer>
</game-screen>`)],
		tutorial: example('Two-by-two terrain', 'Start with the checker pattern used by the ground.', html`<game-screen width="80" height="48">
	<game-tilemap columns="2" rows="2" role="img" aria-label="Two-by-two terrain">
		<span style="background:#265c67"></span><span style="background:#398f85"></span>
		<span style="background:#398f85"></span><span style="background:#265c67"></span>
	</game-tilemap>
</game-screen>`),
	},
	'game-tile': {
		title: 'Name each terrain cell',
		summary: html`A tile’s <code>index</code> identifies its pattern. Repeat indices 0 and 1 to build the ground. Inside a pattern bank, a tile can instead contain whitespace-separated pixel indices.`,
		examples: [example('Indexed cells', 'An index can occur more than once. Here each index shares an authored CSS color.', html`<game-screen width="80" height="48">
	<game-tilemap columns="2" rows="2" role="img" aria-label="Indexed terrain tiles">
		<game-tile index="0" style="background:#265c67"></game-tile>
		<game-tile index="1" style="background:#398f85"></game-tile>
		<game-tile index="1" style="background:#398f85"></game-tile>
		<game-tile index="0" style="background:#265c67"></game-tile>
	</game-tilemap>
</game-screen>`), atlas],
	},
	'game-tileset': {
		title: 'Declare a pattern bank',
		summary: html`Give the bank an <code>id</code> that sprites and maps can reference via <code>tileset</code>. Set <code>tile-width</code> and <code>tile-height</code> to describe the image grid.`,
		examples: [atlas, example('Indexed pixel patterns', 'An indexed bank records the pixel colors by number. It is source data for the renderer or an exporter. This small map visualizes the four indices with authored cell styles.', html`<game-tileset id="indexed-ground" tile-width="2" tile-height="2">
	<game-tile index="0">3 3
3 0</game-tile>
</game-tileset>
<game-screen width="48" height="48">
	<game-tilemap tileset="indexed-ground" columns="2" rows="2" role="img" aria-label="Indexed ground pattern">
		<span style="background:#a7debd"></span><span style="background:#a7debd"></span>
		<span style="background:#a7debd"></span><span style="background:#265c67"></span>
	</game-tilemap>
</game-screen>`)],
	},
	'game-palette': {
		title: 'Choose the ground colors',
		summary: html`Use <code>colors</code> for the indexed color list. Set <code>cycle-start</code> and <code>cycle-rate</code> to describe the cycle. The CSS ground effect uses the corresponding <code>--palette-0</code> through <code>--palette-3</code> and <code>--cycle-rate</code> values.`,
		examples: [palette, example('Alternate sector colors', 'The same palette indices give Amber Expanse its warmer colors.', html`<game-palette id="amber-colors" colors="#825658 #b17c65 #e1aa7a #f7d59c"
	cycle-start="2" cycle-rate="7"></game-palette>
<game-screen width="128" height="24">
	<game-tilemap palette="amber-colors" columns="4" rows="1" role="img" aria-label="Amber Expanse palette swatches">
		<game-tile index="0" style="background:#825658"></game-tile>
		<game-tile index="1" style="background:#b17c65"></game-tile>
		<game-tile index="2" style="background:#e1aa7a"></game-tile>
		<game-tile index="3" style="background:#f7d59c"></game-tile>
	</game-tilemap>
</game-screen>`)],
	},
	'game-stage': {
		title: 'Assemble a sector',
		summary: html`Group the terrain and scenery under a stage with a unique <code>id</code>. Set <code>name</code>, <code>length</code>, and <code>speed</code>. Add the horizon and terrain layers from the previous steps. When a running world activates the stage, it emits <code>game-stage-change</code> from that stage.`,
		examples: [
			example('Emerald Reach scenery', 'This flat preview shows the stage’s authored scenery before the world projects it into depth.', html`<game-palette id="reach-stage-colors" colors="#265c67 #398f85 #64c2a1 #a7debd"></game-palette>
<game-screen width="128" height="64">
	<game-stage id="reach-preview" name="Emerald Reach" length="480" speed="18">
		${background('reach-preview', 'reach-mountains', 0.18, 0.04, { label: 'Mountains over Emerald Reach', excerpt: reachSceneryExcerpt })}
		<game-layer style="top:52%">
			<game-tilemap columns="2" rows="2" palette="reach-stage-colors">
				<game-tile index="0" style="background:#265c67"></game-tile>
				<game-tile index="1" style="background:#398f85"></game-tile>
				<game-tile index="1" style="background:#398f85"></game-tile>
				<game-tile index="0" style="background:#265c67"></game-tile>
			</game-tilemap>
		</game-layer>
		<game-sprite x="22" y="24" width="22" height="36">
			<img src="${art}/pine.png" alt="Trackside pine">
		</game-sprite>
	</game-stage>
</game-screen>`),
			example('Stage activation in a world', 'Launch and fly for four seconds to enter the dunes. The event readout reports the newly active stage.', worldMarkup(true, true), status('game-stage-change')),
		],
	},
	'game-input': {
		title: 'Wire up flight controls',
		summary: html`Buttons use <code>data-action</code> to name commands. Set <code>deadzone</code> and <code>fire-button</code> for controller input. Listen for <code>game-input</code> to receive direction, fire state, and commands, and <code>game-controller-change</code> to detect a controller change.`,
		examples: [
			example('Direction and fire', 'Hold a direction or press an arrow key with a control focused. Press Fire to send a command. A connected controller uses the same events.', html`<game-input deadzone="0.18" fire-button="0">
	<div role="group" aria-label="Flight input example">
		<button type="button" data-action="left">Left</button>
		<button type="button" data-action="right">Right</button>
		<button type="button" data-action="fire">Fire</button>
	</div>
</game-input>`, status('game-input')),
			example('Start, pause, and restart', 'Send lifecycle commands through native buttons. A world interprets these commands during play.', html`<game-input>
	<button type="button" data-action="start">Start</button>
	<button type="button" data-action="pause">Pause or resume</button>
	<button type="button" data-action="restart">Restart</button>
</game-input>`, status('game-input')),
		],
	},
	'game-world': {
		title: 'Fly the assembled world',
		summary: html`Wrap the screen, stage, pattern banks, player, and input in <code>game-world</code>. Observe <code>state</code>, <code>score</code>, and <code>stage</code>. The world emits <code>game-world-change</code> when its state changes and <code>game-world-error</code> if it cannot initialize.`,
		examples: [world],
	},
	'game-scene': {
		title: 'Add a preflight briefing',
		summary: html`A scene holds an ordinary HTML screen. Use a unique <code>id</code> as its fragment destination. A flow uses <code>data-start</code> for its native default and reflects the current selection with <code>active</code>.`,
		examples: [example('Standalone scene', 'A scene can hold a briefing, a map, or the game itself.', html`<game-scene id="observation">
	<h3>Observation deck</h3>
	<div>Fly through Emerald Reach, Amber Expanse, and Violet Citadel.</div>
</game-scene>`), flow],
	},
	'game-menu': {
		title: 'Offer a route selection',
		summary: html`Put native links inside a menu. Set <code>data-key</code> on a link to add a local shortcut. A fragment selection emits a cancelable <code>game-action</code> event before it navigates.`,
		examples: [menu, example('Link to a full game', 'A menu can also contain ordinary page links.', html`<game-menu>
	<nav aria-label="Game launch">
		<a href="${paths.aetherWing}">Open the full game</a>
		<a href="${paths.games}">Browse games</a>
	</nav>
</game-menu>`)],
		tutorial: example('Choose a sector briefing', 'Fragment links jump to briefing sections. Focus either link and press 1 or 2 to try the shortcut.', html`<game-menu>
	<nav aria-label="Sector briefing">
		<a href="#briefing-reach" data-key="1">Emerald Reach</a>
		<a href="#briefing-citadel" data-key="2">Violet Citadel</a>
	</nav>
</game-menu>
<p id="briefing-reach" tabindex="-1">Dodge the swaying moth drones.</p>
<p id="briefing-citadel" tabindex="-1">Sentinels track your position.</p>`, status('game-action')),
	},
	'game-modal': {
		title: 'Explain the controls',
		summary: html`Wrap a native <code>dialog</code> in a modal element. Open it with a button command, or set the boolean <code>open</code> attribute after upgrade. The wrapper emits <code>game-modal-change</code> after the native dialog toggles.`,
		examples: [modal, example('Initially visible dialog', 'The native open attribute shows a nonmodal dialog on load. Close it with its form button.', html`<game-modal open>
	<dialog open aria-label="Briefing note" style="position:static;margin:0">
		<p>Shields recharge between sectors.</p>
		<form method="dialog"><button>Dismiss briefing note</button></form>
	</dialog>
</game-modal>`, status('game-modal-change'))],
		tutorial: example('Flight controls dialog', 'Open the controls briefing and close it with the button or Escape.', html`<button type="button" command="show-modal" commandfor="flight-controls-dialog">Show flight controls</button>
<game-modal>
	<dialog id="flight-controls-dialog" aria-label="Flight controls briefing">
		<p>Steer with the arrow keys or WASD. Hold Space to fire.</p>
		<form method="dialog"><button autofocus>Close flight controls</button></form>
	</dialog>
</game-modal>`, status('game-modal-change')),
	},
	'game-flow': {
		title: 'Link the briefing to launch',
		summary: html`Put scenes inside a flow. Set <code>start</code> to the briefing ID and mark the same scene with <code>data-start</code>. Links select scenes through the URL fragment. The flow reflects selection in <code>scene</code> and emits <code>game-scene-change</code>.`,
		examples: [flow, example('Default to the first scene', 'When no start is specified, the first named scene is shown. Follow the link to select the second.', html`<game-flow>
	<game-scene id="first-map" tabindex="-1"><a href="#second-map">Open route map</a></game-scene>
	<game-scene id="second-map" tabindex="-1"><a href="#first-map">Close route map</a></game-scene>
</game-flow>`, status('game-scene-change'))],
		tutorial: example('Briefing and launch scenes', 'Follow Prepare to launch to switch screens. The next link opens the full course.', html`<game-flow start="aether-briefing">
	<game-scene id="aether-briefing" data-start tabindex="-1">
		<h3>Mission briefing</h3>
		<game-menu><a href="#aether-launch" data-key="1">Prepare to launch</a></game-menu>
	</game-scene>
	<game-scene id="aether-launch" tabindex="-1">
		<h3>Ready to fly</h3>
		<a href="${paths.aetherWing}">Launch the full game</a>
		<a href="#aether-briefing">Return to briefing</a>
	</game-scene>
</game-flow>`, status('game-scene-change')),
	},
};
