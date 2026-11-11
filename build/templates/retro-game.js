import { html } from '../../shared/html.js';
import { paths } from '../../shared/routes.js';
import { layout } from '../../shared/templates/layout.js';
import { componentCatalog } from '../shared/components.js';

/** @import { Raw } from '../../shared/html.js' */
/** @import { Social } from '../../shared/data/atproto.js' */

const assets = '/components/retro-game-demo';
const head = html`<link rel="stylesheet" href="/components/retro-game/styles.css">
	<link rel="stylesheet" href="/components/retro-game-demo/styles.css">`;

/** @param {string} file @param {string} alt @param {number} width @param {number} height */
function image(file, alt, width, height) {
	return html`<img src="${assets}/${file}.png" width="${width}" height="${height}" alt="${alt}">`;
}

/** @param {string} label @param {string} target @param {string} attribute @param {number} value @param {number} max @param {number} [min] @param {number} [step] */
function slider(label, target, attribute, value, max, min = 0, step = 1) {
	return html`<label hidden>${label}
		<input type="range" data-retro-for="${target}" name="${attribute}" value="${value}" min="${min}" max="${max}" step="${step}">
	</label>`;
}

/** @param {string} id @param {string} title @param {string} description @param {Raw} markup @param {Raw} [controls] */
function example(id, title, description, markup, controls = html``) {
	return html`<section id="${id}" aria-labelledby="${id}-heading">
		<h2 id="${id}-heading">${title}</h2>
		<p>${description}</p>
		<div data-retro-demo>${markup}${controls}</div>
		<details>
			<summary>View HTML for ${title}</summary>
			<figure data-code><pre tabindex="0" aria-label="${title} HTML"><code>${markup.value}</code></pre></figure>
		</details>
	</section>`;
}

/** @param {string} id @param {string} mode @param {string} [texture] */
function layer(id, mode, texture = 'grid') {
	const road = texture === 'road';
	return html`<retro-layer id="${id}" mode="${mode}" amplitude="12">
	${image(texture, road ? 'Striped road texture' : 'Repeating teal grid', road ? 128 : 32, road ? 24 : 32)}
</retro-layer>`;
}

/** @param {Social} [social] */
export function retroGame(social) {
	const component = componentCatalog.find(({ tag }) => { return tag === 'retro-game'; });
	return layout({
		social, head, title: 'Retro game components', path: paths.retroGame,
		description: 'Compose retro games in HTML. Try live bitmap, tile, scene, menu, and dialog examples.',
		scripts: html`<script type="module" src="/components/retro-game-demo.js"></script>`,
		body: html`<article data-components data-retro-docs>
			<p><a href="${paths.components}">All components</a></p>
			<h1>Retro game components</h1>
			<p>Build a screen from tiles, sprites, and bitmap layers. Link scenes to make a game with plain HTML.</p>
			<nav aria-label="Retro game resources">
				<a href="${paths.retroRelay}">Play Signal Relay</a>
				<a href="${component?.manifest ?? ''}">Custom Elements Manifest</a>
				<a href="${component?.source ?? ''}">Source on GitHub</a>
			</nav>
			<nav aria-label="Component examples">
				<a href="#screen">Screen</a> <a href="#tilemap">Tilemap</a> <a href="#sprite">Sprite</a>
				<a href="#layers">Bitmap layers</a> <a href="#scene">Scene</a> <a href="#game">Game</a>
				<a href="#menu">Menu</a> <a href="#modal">Modal</a>
			</nav>

			${example('screen', 'Logical screen', 'A fixed logical width and height define the coordinate space. The screen grows with its container and clips graphics at its edges.',
				html`<retro-screen width="160" height="48" role="img" aria-label="160 by 48 pixel viewport"></retro-screen>`)}

			${example('tilemap', 'Tilemap', 'Lay out tile cells in row-major order. Style named tiles with CSS, or use images inside the cells. Layer order follows the order of children in the screen.',
				html`<retro-screen width="64" height="32">
	<retro-tilemap columns="4" rows="2" role="img" aria-label="Two rows of wall and floor tiles">
		<span data-tile="wall"></span><span data-tile="wall"></span><span data-tile="floor"></span><span data-tile="wall"></span>
		<span data-tile="floor"></span><span data-tile="floor"></span><span data-tile="floor"></span><span data-tile="wall"></span>
	</retro-tilemap>
</retro-screen>`)}

			${example('sprite', 'Bitmap sprite', 'Position an image using logical pixels. Change scale to enlarge the bitmap around its top-left corner, as in a sprite-scaling effect.',
				html`<retro-screen width="128" height="64">
	<retro-sprite id="sprite-rover" x="24" y="12" width="16" height="16" scale="2">
		${image('rover', 'Pixel rover', 16, 16)}
	</retro-sprite>
</retro-screen>`, slider('Rover scale', 'sprite-rover', 'scale', 2, 3, 0.5, 0.25))}

			${example('layers', 'Parallax layers', 'Move one camera. The screen passes its offsets down as attributes and each layer multiplies them by its own factor. The trees shift four times as far as the ridge.',
				html`<retro-screen id="parallax-camera" width="128" height="96" camera-x="0">
	<retro-layer factor="0.25">${image('ridge', 'Distant purple ridge', 128, 96)}</retro-layer>
	<retro-layer factor="1">${image('trees', 'Foreground pine trees', 128, 96)}</retro-layer>
</retro-screen>`, slider('Camera position', 'parallax-camera', 'camera-x', 0, 120))}

			${example('affine', 'Affine rotation', 'One transform rotates and scales the entire repeating texture. This is the basic operation behind the SNES Mode 7 effect.',
				html`<retro-screen>${layer('affine-grid', 'affine')}</retro-screen>`, slider('Grid angle', 'affine-grid', 'angle', 0, 180))}
			${example('scanlines', 'Scanline offsets', 'Offset every horizontal row by a different amount. Phase moves the wave through the texture.',
				html`<retro-screen>${layer('row-grid', 'scanlines')}</retro-screen>`, slider('Scanline phase', 'row-grid', 'phase', 0, 360))}
			${example('columns', 'Column offsets', 'Offset every vertical column. A periodic offset gives a flat grid the appearance of twisting.',
				html`<retro-screen>${layer('column-grid', 'columns')}</retro-screen>`, slider('Column phase', 'column-grid', 'phase', 0, 360))}
			${example('road', 'Perspective road', 'Keep the sky above the horizon. Increase the bitmap scale on each row toward the bottom, bend the road with phase, and scroll the texture vertically to advance the lane markings.',
				html`<retro-screen>${layer('road-texture', 'road', 'road')}</retro-screen>`,
				html`${slider('Road bend', 'road-texture', 'phase', 0, 360)}${slider('Road travel', 'road-texture', 'scroll-y', 0, 120)}`)}

			${example('scene', 'Scene', 'A scene contains ordinary HTML, including its own heading, graphics, or controls. Give it a unique ID when you use it in a game.',
				html`<retro-scene id="scene-observation">
	<h3>Observation deck</h3>
	<p>The relay tower is visible from here.</p>
</retro-scene>`)}

			${example('game', 'Scene switching', 'A game owns its direct scenes. The start attribute names the initial scene. Mark that same scene with data-start for the CSS fallback. Fragment links select scenes and preserve browser Back and Forward.',
				html`<retro-game start="demo-dock">
	<retro-scene id="demo-dock" data-start tabindex="-1">
		<h3>Dock</h3>
		<a href="#demo-bridge">Go to the bridge</a>
	</retro-scene>
	<retro-scene id="demo-bridge" tabindex="-1">
		<h3>Bridge</h3>
		<a href="#demo-dock">Return to the dock</a>
	</retro-scene>
</retro-game>`, html`<p role="status" data-retro-event="retro-scene-change" hidden></p>`)}

			${example('menu', 'Menu actions', 'Use regular links. A menu reports fragment choices with a bubbling retro-action event. With a link focused, data-key maps a key to another link in that menu.',
				html`<retro-menu>
	<nav aria-label="Radio channels">
		<a href="#demo-weather" data-key="1">Weather</a>
		<a href="#demo-signal" data-key="2">Signal</a>
	</nav>
</retro-menu>
<p id="demo-weather" tabindex="-1">Weather channel</p>
<p id="demo-signal" tabindex="-1">Signal channel</p>`, html`<p role="status" data-retro-event="retro-action" hidden></p>`)}

			${example('modal', 'Modal dialog', 'Wrap a native dialog. Open it with a button command. Close it with the form or Escape to return focus to the opener. The wrapper reflects its state to the open attribute.',
				html`<button type="button" command="show-modal" commandfor="demo-inventory">Open inventory</button>
<retro-modal>
	<dialog id="demo-inventory" aria-labelledby="inventory-title">
		<h3 id="inventory-title">Inventory</h3>
		<p>One spare battery.</p>
		<form method="dialog"><button autofocus>Close inventory</button></form>
	</dialog>
</retro-modal>`, html`<p role="status" data-retro-event="retro-modal-change" hidden></p>`)}

			<section aria-labelledby="retro-use">
				<h2 id="retro-use">Use these elements in your own HTML</h2>
				<p>Vendor the <code>retro-game</code> package directory from GitHub. Load the stylesheet for layout and the ES module for canvas effects, event reporting, and attribute coordination. The live examples above use a separate script only to connect their sliders and event readouts.</p>
				<figure data-code><pre tabindex="0" aria-label="Package imports"><code>${'<link rel="stylesheet" href="./vendor/retro-game/styles.css">\n<script type="module" src="./vendor/retro-game/index.js"></script>'}</code></pre></figure>
				<p>Each example exposes the HTML it renders. Point image paths at your own artwork and supply CSS for tile cells. The manifest documents attributes, defaults, CSS hooks, child markup, and event payloads. Give scenes document-unique IDs and use fragment links for every transition. A link’s absence can represent a blocked move, and separate scenes can represent the same place before and after collecting an item.</p>
			</section>
			<section aria-labelledby="retro-hardware">
				<h2 id="retro-hardware">From HTML to console data</h2>
				<p>Signal Relay uses a finite scene graph, a four-color maze tileset, and small bitmap sprites. A console tool could encode the scene IDs and links as a state table, pack the backgrounds into tiles, and map sprite positions to the target’s sprite table. Palette, tile, and sprites-per-scanline limits would need checks for each target.</p>
				<p>The graphics demos approximate these effects in the browser. A raster offset is a row or column transform in the renderer. A console implementation would use the target’s scroll registers, raster timing, and available scaling hardware.</p>
				<p><a href="https://snes.nesdev.org/wiki/SNES_Development_Manual">Nintendo SNES Development Manual</a> · <a href="https://segaretro.org/images/9/95/GenesisSoftwareManual.pdf">Sega Genesis Software Manual</a></p>
			</section>
		</article>`,
	});
}

const map = ['########', '########', '###.####', '#....###', '###.####', '########'];
const directions = {
	east: 'ArrowRight', west: 'ArrowLeft', north: 'ArrowUp', south: 'ArrowDown',
};

/** @type {Array<{ id: string, x: number, y: number, title: string, text: string, carrying?: boolean, links: Array<[label: string, to: string, direction?: keyof typeof directions]> }>} */
const rooms = [
	{ id: 'landing', x: 1, y: 3, title: 'Landing pad', text: 'Recover the signal crystal and bring it to the relay gate.', links: [['Move east', 'hall', 'east']] },
	{ id: 'hall', x: 2, y: 3, title: 'Service hall', text: 'The passage continues east to a junction.', links: [['Move east', 'junction', 'east'], ['Move west', 'landing', 'west']] },
	{ id: 'junction', x: 3, y: 3, title: 'Junction', text: 'The gate east is locked. A light flickers to the north.', links: [['Move north', 'crystal', 'north'], ['Move south', 'dead-end', 'south'], ['Move west', 'hall', 'west']] },
	{ id: 'dead-end', x: 3, y: 4, title: 'Storage bay', text: 'A dead end. The only exit is back north.', links: [['Move north', 'junction', 'north']] },
	{ id: 'crystal', x: 3, y: 2, title: 'Crystal recovered', text: 'You picked up the signal crystal. Return south to the junction.', carrying: true, links: [['Move south', 'unlocked', 'south']] },
	{ id: 'unlocked', x: 3, y: 3, title: 'Gate unlocked', text: 'The crystal opens the gate. The relay is one step east.', carrying: true, links: [['Move east', 'online', 'east'], ['Move north', 'crystal', 'north'], ['Move south', 'dead-end-key', 'south'], ['Move west', 'hall-key', 'west']] },
	{ id: 'dead-end-key', x: 3, y: 4, title: 'Storage bay', text: 'A dead end. Take the crystal back north to the junction.', carrying: true, links: [['Move north', 'unlocked', 'north']] },
	{ id: 'hall-key', x: 2, y: 3, title: 'Service hall', text: 'The junction and unlocked gate are to the east.', carrying: true, links: [['Move east', 'unlocked', 'east'], ['Move west', 'landing-key', 'west']] },
	{ id: 'landing-key', x: 1, y: 3, title: 'Landing pad', text: 'You have the crystal. Take it east to the relay gate.', carrying: true, links: [['Move east', 'hall-key', 'east']] },
	{ id: 'online', x: 4, y: 3, title: 'Relay online', text: 'The relay is broadcasting again. Mission complete.', carrying: true, links: [['Play again', 'landing']] },
];

const tiles = map.map((row, y) => {
	return [...row].map((cell, x) => {
		const kind = cell === '#' ? 'wall' : 'floor';
		return html`<span data-tile="${kind}"${x === 4 && y === 3 ? html` data-gate` : html``}></span>`;
	});
}).flat();

/** @param {typeof rooms[number]} room */
function roomScene(room) {
	return html`<retro-scene id="relay-${room.id}" tabindex="-1">
		<h2>${room.title}</h2>
		<retro-screen width="128" height="96" aria-hidden="true">
			<retro-tilemap columns="8" rows="6"${room.carrying ? html` data-powered` : html``}>${tiles}</retro-tilemap>
			${room.carrying ? html`` : html`<retro-sprite x="48" y="32" width="16" height="16">${image('signal', '', 16, 16)}</retro-sprite>`}
			<retro-sprite x="${room.x * 16}" y="${room.y * 16}" width="16" height="16">${image('rover', '', 16, 16)}</retro-sprite>
		</retro-screen>
		<p>${room.text}</p>
		<retro-menu><nav aria-label="Moves">
			${room.links.map(([label, to, direction]) => {
				return html`<a href="#relay-${to}"${direction ? html` data-key="${directions[direction]}"` : html``}>${label}</a>`;
			})}
		</nav></retro-menu>
	</retro-scene>`;
}

/** @param {Social} [social] */
export function retroRelay(social) {
	return layout({
		social, head, title: 'Signal Relay', path: paths.retroRelay,
		description: 'Guide a rover through a tile maze, recover the signal crystal, and restore the relay.',
		scripts: html`<script type="module" src="/components/retro-game/index.js"></script>`,
		body: html`<article data-retro-relay>
			<p><a href="${paths.retroGame}">Retro game components</a></p>
			<h1>Signal Relay</h1>
			<p>Recover the crystal to restore communications.</p>
			<details>
				<summary>How to play</summary>
				<p>Choose a direction. You move one tile at a time. If a direction is missing, that path is blocked. The scene text describes the exits and tells you when you collect the crystal.</p>
				<p>Use Tab and Enter to play by keyboard. With JavaScript enabled, you can also use the arrow keys while focused on a move link.</p>
			</details>
			<retro-game start="relay-briefing">
				<retro-scene id="relay-briefing" data-start tabindex="-1">
					<h2>Mission briefing</h2>
					<retro-screen aria-hidden="true">
						<retro-layer>${image('ridge', '', 128, 96)}</retro-layer>
						<retro-sprite x="52" y="60" width="16" height="16" scale="1.5">${image('rover', '', 16, 16)}</retro-sprite>
					</retro-screen>
					<p>The remote relay has gone dark. Send the rover to find its missing crystal.</p>
					<retro-menu><nav aria-label="Mission"><a href="#relay-landing">Start mission</a></nav></retro-menu>
				</retro-scene>
				${rooms.map(roomScene)}
			</retro-game>
			<nav aria-label="Game options">
				<a href="#relay-briefing">Restart</a>
				<button type="button" command="show-modal" commandfor="relay-log">Mission log</button>
			</nav>
			<retro-modal>
				<dialog id="relay-log" aria-labelledby="relay-log-title">
					<h2 id="relay-log-title">Mission log</h2>
					<p>Recover the signal crystal, unlock the east gate, and reach the relay.</p>
					<form method="dialog"><button autofocus>Close log</button></form>
				</dialog>
			</retro-modal>
		</article>`,
	});
}
