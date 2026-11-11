import { html } from '../../shared/html.js';
import { paths } from '../../shared/routes.js';
import { layout } from '../../shared/templates/layout.js';
import { worldMarkup } from './games.js';
import { componentCatalog } from '../shared/components.js';

/** @import { Raw } from '../../shared/html.js' */
/** @import { Social } from '../../shared/data/atproto.js' */

const assets = '/components/retro-game-demo';
const head = html`<link rel="stylesheet" href="/components/retro-game/styles.css">
	<link rel="stylesheet" href="/components/retro-game-demo/styles.css">
	<link rel="stylesheet" href="/games/aether-wing/styles.css">`;

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
				<a href="${paths.aetherWing}">Play Aether Wing</a>
				<a href="${component?.manifest ?? ''}">Custom Elements Manifest</a>
				<a href="${component?.source ?? ''}">Source on GitHub</a>
			</nav>
			<nav aria-label="Component examples">
				<a href="#world">Perspective world</a> <a href="#screen">Screen</a> <a href="#tilemap">Tilemap</a> <a href="#sprite">Sprite</a>
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

			<section id="world" aria-labelledby="world-title">
				<h2 id="world-title">Perspective world</h2>
				<p>This short training range uses the same world renderer and simulation as Aether Wing. Launch, move with arrows or WASD, and hold Space or Fire to shoot. P or Escape pauses. The buttons also work with touch.</p>
				${worldMarkup(true)}
				<details><summary>View the world definition</summary>
					<figure data-code><pre tabindex="0" aria-label="Perspective world HTML"><code>${worldMarkup(true).value}</code></pre></figure>
				</details>
				<p><a href="${paths.aetherWing}">Play all three stages of Aether Wing</a> · <a href="${paths.games}">Games showcase</a></p>
			</section>
			<section aria-labelledby="world-elements">
				<h2 id="world-elements">Define the world in HTML</h2>
				<table><caption>Perspective primitives</caption><thead><tr><th scope="col">Element</th><th scope="col">Authored data</th></tr></thead><tbody>
					<tr><th scope="row"><code>retro-world</code></th><td>Coordinates the optional fixed-step simulation. Reports state, score, and current stage as attributes. Starts on a user action and pauses when the tab becomes hidden.</td></tr>
					<tr><th scope="row"><code>retro-palette</code></th><td>A palette RAM record with indexed colors and a palette cycle rate.</td></tr>
					<tr><th scope="row"><code>retro-tileset</code></th><td>A shared pattern bank. Define tile dimensions and a bitmap sheet, or child tiles containing pixel palette indices.</td></tr>
					<tr><th scope="row"><code>retro-tile</code></th><td>Pixel palette indices inside a bank, or a bank index inside a tilemap.</td></tr>
					<tr><th scope="row"><code>retro-layer</code></th><td>A background plane containing a tilemap. Perspective layers use CSS rotateX and translate3d. Other planes scroll at their own parallax factors.</td></tr>
					<tr><th scope="row"><code>retro-sprite</code></th><td>One graphics primitive for the player, scenery, enemies, shots and effects. References a pattern bank and supplies world coordinates, frame playback, and optional behavior attributes.</td></tr>
					<tr><th scope="row"><code>retro-stage</code></th><td>Groups layer tilemaps, palettes and sprite records. Sets forward speed, length, and sky. Stages play in DOM order after upgrade and can be selected with native sector controls.</td></tr>
					<tr><th scope="row"><code>retro-input</code></th><td>Turns keyboard, held pointer buttons, and a connected gamepad into bubbling input events. Buttons name actions with data-action. Stick deadzone and fire button are attributes.</td></tr>
				</tbody></table>
				<p>Tilemaps and sprites reference the same <code>retro-tileset</code> pattern banks. Tile indices and palette indices are explicit HTML data. CSS paints atlas tiles and advances sprite frames with stepped keyframes. The screen supplies a common perspective origin for ground and sprites.</p>
				<p>State flows down as attributes. Child controls emit <code>retro-input</code>, sprites emit <code>retro-shot</code>, <code>retro-player-hit</code>, and <code>retro-enemy-hit</code>, and stages emit <code>retro-stage-change</code>. The world reports <code>retro-world-change</code>. All events bubble and are composed. The manifest contains each payload and attribute default.</p>
				<p>Run and pause the course, steer with native radio controls, select sectors, and shoot approaching targets with JavaScript disabled. CSS handles perspective, tile painting, ground travel, palette cycling and sprite animation. Upgrade adds continuous movement, depth collisions, aimed projectiles and gamepad input. Missing pattern banks or failed images stop the enhancement and leave the native presentation available.</p>
				<p>Standard gamepads use the left stick or D-pad, bottom face button or right trigger, and Start. Press a button after connecting so the browser exposes the controller. The input element also permits a configurable fire-button index for other mappings. <a href="https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API">Gamepad API behavior</a></p>
			</section>

			<section aria-labelledby="retro-use">
				<h2 id="retro-use">Use these elements in your own HTML</h2>
				<p>Vendor the <code>retro-game</code> package directory from GitHub. Load the stylesheet for layout and the ES module for canvas effects, event reporting, and attribute coordination. The live examples above use a separate script only to connect their sliders and event readouts.</p>
				<figure data-code><pre tabindex="0" aria-label="Package imports"><code>${'<link rel="stylesheet" href="./vendor/retro-game/styles.css">\n<script type="module" src="./vendor/retro-game/index.js"></script>'}</code></pre></figure>
				<p>Each example exposes the HTML it renders. Point image paths at your own artwork and supply CSS for tile cells. The manifest documents attributes, defaults, CSS hooks, child markup, and event payloads. Give scenes document-unique IDs and use fragment links for every transition. A link’s absence can represent a blocked move, and separate scenes can represent the same place before and after collecting an item.</p>
			</section>
			<section aria-labelledby="retro-hardware">
				<h2 id="retro-hardware">From HTML to console data</h2>
				<p>Aether Wing defines pattern banks, tile indices, palettes, layers, sprite records and stages in HTML. A console tool could pack the sprite sheets into tiles, translate placement and wave attributes into tables, and implement projection and input with the target’s assembly routines. Palette, memory, sprites-per-scanline, and raster timing limits need checks for each target.</p>
				<p>The CSS display projects elements through a shared perspective. A console implementation would replace those transforms with fixed-point projection and the target’s scroll registers, raster timing, and available scaling hardware.</p>
				<p><a href="https://snes.nesdev.org/wiki/SNES_Development_Manual">Nintendo SNES Development Manual</a> · <a href="https://segaretro.org/images/9/95/GenesisSoftwareManual.pdf">Sega Genesis Software Manual</a></p>
			</section>
		</article>`,
	});
}
