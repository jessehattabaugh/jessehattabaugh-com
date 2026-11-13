import { GameWorld, GameStage, GamePalette, GameTileset, GameTile } from './world.js';
import { GameInput } from './game-input.js';
export { GameWorld, GameStage, GamePalette, GameTileset, GameTile, GameInput };

/** @param {Element} element @param {string} name @param {number} fallback */
function number(element, name, fallback) {
	const raw = element.getAttribute(name)?.trim();
	const value = raw ? Number(raw) : fallback;
	return Number.isFinite(value) ? value : fallback;
}

/** @param {Element} source @param {string} name @param {object} detail @param {boolean} [cancelable] */
function emit(source, name, detail, cancelable = false) {
	return source.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true, cancelable }));
}

/**
 * Logical pixel viewport. Put layers, tilemaps and sprites directly inside. Graphics clip to the viewport and paint in DOM order.
 * @attr {number} [width=128] - Logical width. Minimum 1.
 * @attr {number} [height=96] - Logical height. Minimum 1.
 * @attr {number} [camera-x=0] - Camera offset in logical pixels. Direct tilemap layers scroll in CSS. Copied to direct bitmap layers on upgrade, insertion, and change.
 * @attr {number} [camera-y=0] - Camera offset in logical pixels. Direct tilemap layers scroll in CSS. Copied to direct bitmap layers on upgrade, insertion, and change.
 * @cssprop [--game-screen-width=32rem] - Maximum rendered width of the responsive viewport.
 * @cssprop [--game-screen-background=#171a29] - Color or CSS background behind the graphics.
 * @markup data-world-viewport - Marks the screen that a world projects into depth. Give that screen tabindex="0" so the world can focus it at launch.
 */
export class GameScreen extends HTMLElement {
	/** @internal */
	static observedAttributes = ['camera-x', 'camera-y'];
	#children = new MutationObserver(() => { this.#sync(); });

	/** @internal */
	connectedCallback() {
		this.#children.observe(this, { childList: true });
		this.#sync();
	}

	/** @internal */
	disconnectedCallback() { this.#children.disconnect(); }
	/** @internal */
	attributeChangedCallback() { this.#sync(); }

	#sync() {
		if (!this.isConnected) { return; }
		for (const layer of this.querySelectorAll(':scope > game-layer')) {
			for (const name of GameScreen.observedAttributes) {
				layer.setAttribute(name, String(number(this, name, 0)));
			}
		}
	}
}

/**
 * Repeating bitmap sampled into a canvas on demand. The first direct img supplies the texture and accessible alternative. A missing, failed or loading image leaves the authored fallback. Put inside a game-screen. Layer resolution defaults to 128 by 96 and is stretched to the viewport. A direct game-screen layer containing a game-tilemap scrolls the map with CSS. Extend the layer beyond the screen when scrolling should reveal more tiles. In a game-world, the perspective mode projects a CSS ground plane and scenery layers use factor and drift for parallax.
 * @attr {"plain" | "affine" | "scanlines" | "columns" | "road" | "perspective"} [mode=plain] - Plain repeats the image. Affine applies one centered transform. Scanlines offset each row; columns offset each column. Road leaves the top third transparent and increases zoom by row toward the viewer, repeating along the texture’s vertical axis. Unknown modes use plain.
 * @attr {number} [width=128] - Canvas width. Rounded and clamped to 1–512.
 * @attr {number} [height=96] - Canvas height. Rounded and clamped to 1–512.
 * @attr {number} [scroll-x=0] - Local horizontal scroll in logical pixels. Positive values move the layer left.
 * @attr {number} [scroll-y=0] - Local vertical scroll in logical pixels. Positive values move the layer up in orthographic modes, or advance texture depth in road mode.
 * @attr {number} [camera-x=0] - Camera offset in logical pixels. Managed by the screen when directly nested in one.
 * @attr {number} [camera-y=0] - Camera offset in logical pixels. Managed by the screen when directly nested in one.
 * @attr {number} [factor=1] - Multiplier for both camera offsets. Applied before adding local scroll.
 * @attr {number} [scale=1] - Base texture scale, clamped to 0.125–16. Road mode multiplies this by depth.
 * @attr {number} [angle=0] - Clockwise degrees around the center. Affine mode only.
 * @attr {number} [amplitude=0] - Maximum strip offset in logical pixels. Scanlines, columns, and road only.
 * @attr {number} [phase=0] - Position within the offset wave in degrees. Scanlines, columns, and road only.
 * @attr {number} [drift=0.05] - Forward parallax drift used when this layer is a direct child of a world stage.
 * @attr {number} [cell-size=4] - World width and depth of a tile in a perspective layer.
 * @cssprop --palette-0 - First floor color on a perspective layer.
 * @cssprop --palette-1 - Second floor color on a perspective layer.
 * @cssprop --palette-2 - First cycling grid color on a perspective layer.
 * @cssprop --palette-3 - Second cycling grid color on a perspective layer.
 * @cssprop [--cycle-rate=5] - Number of palette changes per second on a perspective layer.
 */
export class GameLayer extends HTMLElement {
	/** @internal */
	static observedAttributes = ['mode', 'width', 'height', 'scroll-x', 'scroll-y', 'camera-x', 'camera-y',
		'factor', 'scale', 'angle', 'amplitude', 'phase'];
	#canvas = document.createElement('canvas');
	#frame = 0;
	#children = new MutationObserver(() => { this.#queue(); });

	constructor() {
		super();
		this.#canvas.setAttribute('aria-hidden', 'true');
		/** @internal */
		this.#canvas.hidden = true;
	}

	/** @internal */
	connectedCallback() {
		this.#children.observe(this, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'srcset', 'sizes'] });
		this.addEventListener('load', this.#queue, true);
		this.addEventListener('error', this.#queue, true);
		this.#queue();
	}

	/** @internal */
	disconnectedCallback() {
		this.#children.disconnect();
		this.removeEventListener('load', this.#queue, true);
		this.removeEventListener('error', this.#queue, true);
		cancelAnimationFrame(this.#frame);
		this.#frame = 0;
	}

	/** @internal */
	attributeChangedCallback() { this.#queue(); }

	#queue = () => {
		if (!this.isConnected || this.#frame) { return; }
		this.#frame = requestAnimationFrame(() => {
			this.#frame = 0;
			this.#draw();
		});
	};

	#draw() {
		const image = this.querySelector(':scope > img');
		if (!(image instanceof HTMLImageElement) || !image.complete || !image.naturalWidth) {
			this.#canvas.hidden = true;
			return;
		}
		const context = this.#canvas.getContext('2d');
		if (!context) { this.#canvas.hidden = true; return; }
		const mode = this.getAttribute('mode');
		const pattern = context.createPattern(image, mode === 'road' ? 'repeat-y' : 'repeat');
		if (!pattern) { this.#canvas.hidden = true; return; }

		const width = Math.round(Math.min(512, Math.max(1, number(this, 'width', 128))));
		const height = Math.round(Math.min(512, Math.max(1, number(this, 'height', 96))));
		this.#canvas.width = width;
		this.#canvas.height = height;
		context.imageSmoothingEnabled = false;
		context.fillStyle = pattern;

		const factor = number(this, 'factor', 1);
		const x = number(this, 'scroll-x', 0) + factor * number(this, 'camera-x', 0);
		const y = number(this, 'scroll-y', 0) + factor * number(this, 'camera-y', 0);
		const scale = Math.min(16, Math.max(0.125, number(this, 'scale', 1)));
		const phase = number(this, 'phase', 0) * Math.PI / 180;
		const amplitude = number(this, 'amplitude', 0);

		// Offset one strip at a time. The road also changes texture scale with depth.
		if (mode === 'scanlines' || mode === 'road') {
			const horizon = mode === 'road' ? Math.floor(height / 3) : 0;
			for (let row = horizon; row < height; row++) {
				const depth = (row - horizon + 1) / (height - horizon);
				const zoom = mode === 'road' ? scale * depth * 1.6 : scale;
				const bend = amplitude * Math.sin(depth * 2 * Math.PI + phase);
				const origin = mode === 'road' ? (width - image.naturalWidth * zoom) / 2 : 0;
				const textureY = mode === 'road' ? row - (y + 12 / depth) * zoom : -y;
				pattern.setTransform(new DOMMatrix([zoom, 0, 0, zoom, origin + bend - x, textureY]));
				context.fillRect(0, row, width, 1);
			}
		} else if (mode === 'columns') {
			for (let column = 0; column < width; column++) {
				const offset = amplitude * Math.sin(column / width * 2 * Math.PI + phase);
				pattern.setTransform(new DOMMatrix([scale, 0, 0, scale, -x, offset - y]));
				context.fillRect(column, 0, 1, height);
			}
		} else {
			const angle = mode === 'affine' ? number(this, 'angle', 0) : 0;
			pattern.setTransform(new DOMMatrix().translate(width / 2 - x, height / 2 - y)
				.rotate(angle).scale(scale).translate(-width / 2, -height / 2));
			context.fillRect(0, 0, width, height);
		}
		if (this.#canvas.parentElement !== this) { this.append(this.#canvas); }
		this.#canvas.hidden = false;
	}
}

/**
 * A sprite references a pattern bank or contains its own image. Outside a world, x/y/width/height/scale preserve the original logical-screen API. Within a world, x/y/z/size map to CSS 3D transforms. Sprite sheets animate with CSS keyframes and steps(). Player, enemy and scenery behavior is authored on the same graphics record. Native enemy labels can contain checkbox controls for script-free targeting.
 * @attr {number} [x=0] - Left edge in logical pixels.
 * @attr {number} [y=0] - Top edge in logical pixels.
 * @attr {number} [width=8] - Unscaled bitmap width. Minimum 1.
 * @attr {number} [height=8] - Unscaled bitmap height. Minimum 1.
 * @attr {number} [scale=1] - Size multiplier from the top-left corner, clamped to 0.125–16.
 * @attr {boolean} flip-x - Presence mirrors the bitmap horizontally.
 * @attr {number} [frames=1] - Number of consecutive sheet frames. CSS steps through them. A player selects a bank frame from input.
 * @attr {number} [fps=8] - CSS sprite playback rate.
 * @attr {number} [start-x=0] - Initial horizontal position, clamped to authored bounds.
 * @attr {number} [start-y=1.1] - Initial height, clamped to authored bounds.
 * @attr {number} [min-x=-2.7] - Minimum horizontal position, bounded to -10–10.
 * @attr {number} [max-x=2.7] - Maximum horizontal position, bounded to -10–10 and at least min-x.
 * @attr {number} [min-y=0.3] - Minimum height, bounded to -2–10.
 * @attr {number} [max-y=2.4] - Maximum height, bounded to -2–10 and at least min-y. Equal vertical bounds constrain an actor to the ground.
 * @attr {number} [speed=3.2] - Movement world units per second, clamped to 0.1–12.
 * @attr {number} [max-health=5] - Initial shield capacity, integer 1–99.
 * @attr {number} [radius=0.18] - Collision radius in world units, clamped to 0.05–1.
 * @attr {number} [size=1.2] - Billboard height in world units.
 * @attr {number} [fire-rate=0.16] - Seconds between player shots, clamped to 0.06–2.
 * @attr {number} [shot-speed=70] - Forward shot speed, clamped to 20–180.
 * @attr {number} [recovery=1.2] - Invulnerability after a hit, seconds clamped to 0.1–5.
 * @attr {number} health - For a player, reflected remaining shield. For an enemy, the authored number of shots needed to destroy it (default 1).
 * @attr {number} [at=30] - Forward distance at which the first enemy spawns.
 * @attr {number} [interval=35] - Distance between spawns, clamped to 1–1000.
 * @attr {number} [count=1] - Number of enemies, integer 0–50.
 * @attr {string} [behavior=straight] - straight, sine, dive, or chase.
 * @attr {number} [z=60] - World depth. CSS translate3d projects it through the screen perspective.
 * @attr {number} [spread=0] - Alternating offset to either side of x, clamped to 0–5.
 * @attr {number} [sway=1] - Horizontal amplitude for sine or dive motion.
 * @attr {number} [frequency=2] - Sine angular frequency, clamped to 0–8.
 * @attr {number} [dive-rate=0.45] - Height lost per second in dive movement, clamped to 0–2.
 * @attr {number} [tracking=0.8] - Chase response coefficient, clamped to 0–3.
 * @attr {number} [score=100] - Points awarded on destruction, rounded 0–10000.
 * @attr {number} [fire-delay=1.2] - Delay before the first shot, seconds clamped to 0.1–20.
 * @attr {number} [spacing=16] - World distance between repeating copies, clamped to 2–200.
 * @attr {number} [offset=0] - Initial world distance, clamped to 0–200.
 * @attr {string} actor - Contextual behavior in a world: player, scenery, or enemy. Rendering uses the same sprite primitive.
 * @attr {string} tileset - ID of a pattern bank. Its image provides equal-sized, row-major sprite frames.
 * @attr {number} [aspect=1] - Frame width divided by frame height for CSS world sizing.
 * @attr {number} frame - Reflected selected frame for a player sprite.
 * @attr {number} position-x - Reflected player center coordinate, separate from the image base x/y.
 * @attr {number} position-y - Reflected player center altitude.
 * @attr {integer} [priority=0] - Stacking order in a flat screen. Higher values paint above lower values. Equal values paint in document order. Perspective worlds order sprites by depth.
 * @attr {boolean} invulnerable - Reflected during player recovery after a hit. The world stylesheet flashes the pilot sheet while this attribute is present.
 * @fires {CustomEvent<{ x: number, y: number }>} game-shot - Bubbles and is composed. Emitted on each accepted shot.
 * @fires {CustomEvent<{ health: number, source: "enemy" | "projectile" }>} game-player-hit - Bubbles and is composed. Emitted on an accepted hit, after applying one point of damage and the recovery interval.
 * @fires {CustomEvent<{ remaining: number, destroyed: boolean, score: number }>} game-enemy-hit - Bubbles and is composed. Emitted from the wave for each accepted player shot. Score increases once when an enemy is destroyed.
 * @markup data-native-target - On the label wrapping a target checkbox and sprite image, enables pointer targeting without JavaScript.
 */
export class GameSprite extends HTMLElement {}

/**
 * A viewport-filling CSS grid. Use one element per cell, in row-major order, and style the cell or include an image. Cells beyond the declared grid are clipped. Layout uses typed CSS attr(). In a world, child game-tile elements name bank indices. Background maps use CSS atlas positions and may provide background-image, --sheet-columns and --sheet-rows for native rendering. Indexed ground maps repeat in the projected layer.
 * @attr {number} [columns=16] - Positive integer number of tile columns.
 * @attr {number} [rows=12] - Positive integer number of tile rows.
 * @attr {string} tileset - Pattern-bank ID for tile references.
 * @attr {string} palette - Palette ID for indexed patterns.
 * @attr {string} encoding - Optional indices means whitespace-separated row-major tile indices. Otherwise use child game-tile cells.
 * @cssprop --sheet-columns - Pattern-bank column count.
 * @cssprop --sheet-rows - Pattern-bank row count.
 */
export class GameTilemap extends HTMLElement {}

/**
 * A scene contains ordinary light DOM. Within a game, use a document-unique id and tabindex="-1" for focus after navigation. Outside a game it renders normally.
 * @attr {string} id - Fragment identifier for links and the game start and scene attributes.
 * @attr {boolean} data-start - Author this on one direct scene as the stylesheet’s default scene.
 * @attr {boolean} active - Reflected by the owning game after upgrade.
 */
export class GameScene extends HTMLElement {}

/**
 * Owns direct game-scene children. Use a document fragment link to select a scene, including without scripting. Browser history restores the scene. The start or first named scene is used when the fragment is absent or unknown.
 * @attr {string} start - ID of the initial scene. Put data-start on the same scene for the stylesheet fallback.
 * @attr {string} scene - Reflects the selected scene after upgrade. Set to a direct scene ID to navigate. Invalid values are restored to the scene selected by the current fragment or start.
 * @fires {CustomEvent<{ scene: string, previous: string }>} game-scene-change - Bubbles and is composed. Emitted after switching between two named scenes. Initial selection is silent.
 */
export class GameFlow extends HTMLElement {
	/** @internal */
	static observedAttributes = ['scene', 'start'];
	#active = '';
	#reflecting = false;
	#children = new MutationObserver((records) => {
		if (records.some(({ target, type }) => {
			return target === this || (type === 'attributes' && target.parentNode === this);
		})) { this.#fromLocation(); }
	});

	/** @internal */
	connectedCallback() {
		this.#children.observe(this, { childList: true, subtree: true, attributes: true, attributeFilter: ['id'] });
		window.addEventListener('hashchange', this.#fromLocation);
		this.#fromLocation();
	}

	/** @internal */
	disconnectedCallback() {
		this.#children.disconnect();
		window.removeEventListener('hashchange', this.#fromLocation);
		this.removeAttribute('data-game-ready');
		this.#active = '';
	}

	/** @internal
	 * @param {string} name @param {string | null} _previous @param {string | null} value */
	attributeChangedCallback(name, _previous, value) {
		if (!this.isConnected || this.#reflecting || !this.hasAttribute('data-game-ready')) { return; }
		if (name === 'start') { this.#fromLocation(); return; }
		const target = this.#scenes().find((scene) => { return scene.id === value; });
		if (target) {
			location.hash = encodeURIComponent(target.id);
			this.#select(target, true);
		} else {
			this.#fromLocation();
		}
	}

	#scenes() {
		return Array.from(this.querySelectorAll(':scope > game-scene[id]')).filter((scene) => { return scene.id; });
	}

	#fromLocation = () => {
		const scenes = this.#scenes();
		let id = location.hash.slice(1);
		try { id = decodeURIComponent(id); } catch { /* An invalid escape cannot select a scene. */ }
		const requested = scenes.find((scene) => { return scene.id === id; });
		const initial = scenes.find((scene) => { return scene.id === this.getAttribute('start'); });
		this.#select(requested ?? initial ?? scenes[0], Boolean(requested));
	};

	/** @param {Element | undefined} selected @param {boolean} focus */
	#select(selected, focus) {
		const previous = this.#active;
		this.#active = selected?.id ?? '';
		for (const scene of this.#scenes()) { scene.toggleAttribute('active', scene === selected); }
		this.#reflecting = true;
		if (selected) { this.setAttribute('scene', selected.id); } else { this.removeAttribute('scene'); }
		this.#reflecting = false;
		this.setAttribute('data-game-ready', '');
		if (previous && this.#active && this.#active !== previous) {
			if (focus && selected instanceof HTMLElement) { selected.focus({ preventScroll: true }); }
			emit(this, 'game-scene-change', { scene: this.#active, previous });
		}
	}
}

/**
 * Contains native fragment links, typically in a nav. Optional data-key attributes on links map KeyboardEvent.key values to actions while a link in that menu has focus. Modified clicks and nested menus keep their native ownership.
 * @fires {CustomEvent<{ scene: string }>} game-action - Dispatched from the chosen link before fragment navigation. Bubbles, is composed and is cancelable. The detail contains the fragment text without #, including any percent-encoding.
 * @markup data-key - On a descendant fragment link, adds a shortcut while focus is inside the menu. Use the KeyboardEvent.key value.
 */
export class GameMenu extends HTMLElement {
	/** @internal */
	connectedCallback() {
		this.addEventListener('click', this.#click);
		this.addEventListener('keydown', this.#key);
	}

	/** @internal */
	disconnectedCallback() {
		this.removeEventListener('click', this.#click);
		this.removeEventListener('keydown', this.#key);
	}

	/** @param {MouseEvent} event */
	#click = (event) => {
		if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) { return; }
		const link = event.target instanceof Element && event.target.closest('a[href^="#"]');
		if (!(link instanceof HTMLAnchorElement) || link.closest('game-menu') !== this) { return; }
		const scene = link.getAttribute('href')?.slice(1);
		if (scene && !emit(link, 'game-action', { scene }, true)) { event.preventDefault(); }
	};

	/** @param {KeyboardEvent} event */
	#key = (event) => {
		if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) { return; }
		if (!(event.target instanceof HTMLAnchorElement) || event.target.closest('game-menu') !== this) { return; }
		const link = Array.from(this.querySelectorAll('a[href^="#"][data-key]')).find((candidate) => {
			return candidate instanceof HTMLAnchorElement && candidate.closest('game-menu') === this && candidate.dataset.key === event.key && candidate.getClientRects().length;
		});
		if (link instanceof HTMLAnchorElement) {
			event.preventDefault();
			link.click();
		}
	};
}

/**
 * Coordinates one direct dialog child. Use native show-modal commands or the open attribute after upgrade. Escape and method=dialog preserve native behavior. A missing dialog is inert until inserted.
 * @attr {boolean} open - Presence opens the dialog, removal closes it. Reflected from native toggles. At initialization an already-open native dialog is adopted.
 * @fires {CustomEvent<{ open: boolean }>} game-modal-change - Bubbles and is composed. Emitted for a changed open state after initialization. Native toggle notifications can coalesce.
 */
export class GameModal extends HTMLElement {
	/** @internal */
	static observedAttributes = ['open'];
	/** @type {HTMLDialogElement | null} */
	#dialog = null;
	#open = false;
	#reflecting = false;
	#children = new MutationObserver(() => { this.#bind(); });

	/** @internal */
	connectedCallback() {
		this.#children.observe(this, { childList: true });
		this.#bind();
	}

	/** @internal */
	disconnectedCallback() {
		this.#children.disconnect();
		this.#dialog?.removeEventListener('toggle', this.#toggle);
		this.#dialog = null;
	}

	/** @internal */
	attributeChangedCallback() { if (!this.#reflecting) { this.#apply(); } }

	#bind() {
		const dialog = this.querySelector(':scope > dialog');
		if (dialog === this.#dialog) { return; }
		this.#dialog?.removeEventListener('toggle', this.#toggle);
		this.#dialog = dialog instanceof HTMLDialogElement ? dialog : null;
		if (!this.#dialog) { return; }
		if (this.#dialog.open) { this.setAttribute('open', ''); }
		this.#apply();
		this.#open = this.#dialog.open;
		this.#dialog.addEventListener('toggle', this.#toggle);
	}

	#apply() {
		const dialog = this.#dialog;
		if (!dialog?.isConnected || dialog.parentElement !== this) { return; }
		if (this.hasAttribute('open') && !dialog.open) { dialog.showModal(); }
		if (!this.hasAttribute('open') && dialog.open) { dialog.close(); }
	}

	#toggle = () => {
		const open = this.#dialog?.open ?? false;
		this.#reflecting = true;
		this.toggleAttribute('open', open);
		this.#reflecting = false;
		if (open === this.#open) { return; }
		this.#open = open;
		emit(this, 'game-modal-change', { open });
	};
}

if (!customElements.get('game-screen')) {
	customElements.define('game-screen', GameScreen);
}
if (!customElements.get('game-layer')) {
	customElements.define('game-layer', GameLayer);
}
if (!customElements.get('game-sprite')) {
	customElements.define('game-sprite', GameSprite);
}
if (!customElements.get('game-tilemap')) {
	customElements.define('game-tilemap', GameTilemap);
}
if (!customElements.get('game-world')) {
	customElements.define('game-world', GameWorld);
}
if (!customElements.get('game-stage')) {
	customElements.define('game-stage', GameStage);
}
if (!customElements.get('game-palette')) {
	customElements.define('game-palette', GamePalette);
}
if (!customElements.get('game-tileset')) {
	customElements.define('game-tileset', GameTileset);
}
if (!customElements.get('game-tile')) {
	customElements.define('game-tile', GameTile);
}
if (!customElements.get('game-input')) {
	customElements.define('game-input', GameInput);
}
if (!customElements.get('game-flow')) {
	customElements.define('game-flow', GameFlow);
}
if (!customElements.get('game-scene')) {
	customElements.define('game-scene', GameScene);
}
if (!customElements.get('game-menu')) {
	customElements.define('game-menu', GameMenu);
}
if (!customElements.get('game-modal')) {
	customElements.define('game-modal', GameModal);
}
