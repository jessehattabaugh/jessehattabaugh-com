import { loadSprite } from './sprite-record.js';

/** The nine supported expression names. */
export const expressions = Object.freeze(['neutral', 'blink', 'happy', 'sad', 'angry', 'silly', 'tired', 'bruh', 'pout']);
const generic = new URL('./generic.svg', import.meta.url).href;
/** The four direction names in sprite row order. */
export const directions = Object.freeze(['down', 'left', 'right', 'up']);

/** @param {string | null} value @param {number} fallback @param {number} max */
function integer(value, fallback, max) {
	const number = Number(value);
	return value !== null && value.trim() !== '' && Number.isInteger(number) && number >= 0 && number <= max ? number : fallback;
}

/**
 * Attribute-driven rpg.actor sprites, expressions and talking with native HTML fallback.
 * See https://rpg.actor/dev-guide for the sprite grid and expression-sheet contract.
 * @attr {string} handle - Bluesky handle, optionally prefixed with @. Loads the public actor sprite and expressions. Missing or unavailable sprites use the bundled courier. An explicit src bypasses lookup.
 * @attr {string} src - Base sprite sheet URL, relative or HTTP(S). Omit to use the resolved or bundled sprite.
 * @attr {string} [emotes={}] - JSON map of expression names to emoteSheet and optional talkSheet image URLs.
 * @attr {number} [columns=3] - Base grid columns, 1–16. Invalid values use 3; zero becomes 1.
 * @attr {number} [rows=4] - Base grid rows, 1–16. Invalid values use 4; zero becomes 1.
 * @attr {'idle' | 'walk'} [animation=idle] - Walking uses ping-pong columns, normally 0,1,2,1.
 * @attr {'down' | 'left' | 'right' | 'up'} [direction=down] - Direction row, clamped to the sheet rows.
 * @attr {'neutral' | 'blink' | 'happy' | 'sad' | 'angry' | 'silly' | 'tired' | 'bruh' | 'pout'} [expression=neutral] - Missing expression sheets fall back to src.
 * @attr {boolean} [talking=false] - Presence alternates open and closed mouth sheets.
 * @attr {boolean} [paused=false] - Presence freezes animation. Reflected by the built-in button.
 * @attr {boolean} [showcase=false] - Presence cycles available expressions and directions through idle, walking and talking poses.
 * @attr {number} [showcase-duration=2400] - Milliseconds per pose, 150–60000, rounded up to the next frame. Invalid values use 2400; values below 150 become 150. Independent of interval.
 * @attr {number} [interval=150] - Frame duration in ms, 50–2000. Invalid values use 150; values below 50 become 50.
 * @attr {number} frame - Optional zero-based column override; invalid values use idle column.
 * @attr {string} [label=RPG character] - Accessible image name.
 * @fires {CustomEvent<{ animation: string, direction: string, expression: string, talking: boolean, paused: boolean }>} actor-change - After observed attribute changes or showcase steps; not on initialization. Bubbles and composed; not cancelable.
 * @fires {CustomEvent<{ src: string }>} actor-load - After a sheet loads. Bubbles and composed; not cancelable.
 * @fires {CustomEvent<{ reason: string, src: string }>} actor-error - Failed handle lookup, malformed emotes JSON, or image failure. Bubbles and composed; not cancelable.
 * @cssprop [--rpg-actor-size=144px] - Rendered sprite width.
 * @csspart sprite - Cropped sprite viewport.
 * @csspart controls - Built-in pause/resume button.
 * @slot - Fallback HTML shown before loading and when base/selected sheets fail.
 */
export class RpgActor extends HTMLElement {
	/** @internal */
	static observedAttributes = ['handle', 'src', 'emotes', 'columns', 'rows', 'animation', 'direction', 'expression', 'talking', 'paused', 'showcase', 'showcase-duration', 'interval', 'frame', 'label'];
	#root = this.shadowRoot ?? this.attachShadow({ mode: 'open' });
	#viewport = this.#root.querySelector('span') ?? document.createElement('span');
	#slot = this.#root.querySelector('slot') ?? document.createElement('slot');
	#button = this.#root.querySelector('button') ?? document.createElement('button');
	#styled = false;
	#active = false;
	/** @type {AbortController | undefined} */
	#lookup;
	/** @type {Awaited<ReturnType<typeof loadSprite>>} */
	#record = null;
	#motion = matchMedia('(prefers-reduced-motion: reduce)');
	#timer = 0;
	#step = 0;
	#elapsed = 0;
	#scene = 0;
	#cycling = false;
	/** @type {Map<string, HTMLImageElement | null>} */
	#images = new Map();
	/** @type {Record<string, { emoteSheet?: string, talkSheet?: string }>} */
	#emotes = {};
	#refresh = () => { this.#draw(); this.#schedule(); };

	constructor() {
		super();
		const style = this.#root.querySelector('link') ?? document.createElement('link');
		if (!style.parentNode) {
			/** @internal */
			style.rel = 'stylesheet';
			/** @internal */
			style.href = new URL('./styles.css', import.meta.url).href;
		}
		this.#styled = Boolean(style.sheet);
		style.addEventListener('load', () => {
			this.#styled = true;
			if (this.isConnected) { this.#refresh(); }
		}, { once: true });
		this.#viewport.setAttribute('role', 'img');
		this.#viewport.setAttribute('part', 'sprite');
		/** @internal */
		this.#viewport.hidden = true;
		/** @internal */
		this.#button.type = 'button';
		this.#button.setAttribute('part', 'controls');
		/** @internal */
		this.#button.hidden = true;
		this.#button.addEventListener('click', () => { this.toggleAttribute('paused'); });
		if (!style.parentNode) { this.#root.prepend(style); }
		if (!this.#slot.parentNode) { this.#root.append(this.#slot); }
		if (!this.#viewport.parentNode || !this.#button.parentNode) {
			const stage = document.createElement('div');
			stage.append(this.#viewport, this.#button);
			this.#root.append(stage);
		}
	}

	/** @internal */
	connectedCallback() {
		this.#active = true;
		this.#resolve();
		this.#motion.addEventListener('change', this.#refresh);
		document.addEventListener('visibilitychange', this.#refresh);
		this.#parseEmotes();
		this.#refresh();
	}

	/** @internal */
	disconnectedCallback() {
		this.#active = false;
		this.#lookup?.abort();
		clearInterval(this.#timer);
		this.#motion.removeEventListener('change', this.#refresh);
		document.removeEventListener('visibilitychange', this.#refresh);
	}

	/** @internal
	 * @param {string} name @param {string | null} before @param {string | null} after */
	attributeChangedCallback(name, before, after) {
		if (before === after || this.#cycling || !this.#active) { return; }
		if (name === 'src' || name === 'handle') {
			this.#images.clear();
			this.#resolve();
		} else if (name === 'emotes') {
			const baseUrl = this.#url(this.getAttribute('src') || this.#record?.src || generic);
			const baseImage = baseUrl ? this.#images.get(baseUrl) : null;
			this.#images.clear();
			if (baseImage) { this.#images.set(baseUrl, baseImage); }
		}
		if (name !== 'paused' && name !== 'label') { this.#step = 0; this.#elapsed = 0; }
		if (!this.isConnected) { return; }
		if (['emotes', 'src', 'handle'].includes(name)) { this.#parseEmotes(); }
		this.#refresh();
		this.#emit('actor-change', this.#state());
	}

	#resolve() {
		this.#lookup?.abort();
		this.#record = null;
		const handle = this.getAttribute('handle');
		if (this.getAttribute('src') || !handle?.trim()) { return; }
		const lookup = this.#lookup = new AbortController();
		const signal = AbortSignal.any([lookup.signal, AbortSignal.timeout(8000)]);
		loadSprite(handle, signal).then((record) => {
			if (lookup.signal.aborted) { return; }
			this.#record = record;
			this.#parseEmotes();
			this.#step = 0;
			this.#refresh();
		}).catch(() => {
			if (!lookup.signal.aborted) { this.#emit('actor-error', { reason: 'Actor lookup unavailable', src: '' }); }
		});
	}

	#parseEmotes() {
		this.#emotes = {};
		try {
			const override = this.getAttribute('emotes');
			const value = override === null ? this.#record?.emotes ?? {} : JSON.parse(override);
			if (!value || typeof value !== 'object' || Array.isArray(value)) { throw new Error(); }
			for (const name of expressions) {
				const variant = value[name];
				if (variant && typeof variant === 'object') {
					this.#emotes[name] = {
						emoteSheet: typeof variant.emoteSheet === 'string' ? variant.emoteSheet : '',
						talkSheet: typeof variant.talkSheet === 'string' ? variant.talkSheet : '',
					};
				}
			}
		} catch { this.#emit('actor-error', { reason: 'Invalid emotes JSON', src: '' }); }
	}

	#state() {
		const direction = this.getAttribute('direction') || 'down';
		const expression = this.getAttribute('expression') || 'neutral';
		return {
			animation: this.getAttribute('animation') === 'walk' ? 'walk' : 'idle',
			direction: directions.includes(direction) ? direction : 'down',
			expression: expressions.includes(expression) ? expression : 'neutral',
			talking: this.hasAttribute('talking'), paused: this.hasAttribute('paused'),
		};
	}

	#schedule() {
		clearInterval(this.#timer);
		const state = this.#state();
		this.#button.setAttribute('aria-label', state.paused ? 'Resume animation' : 'Pause animation');
		this.#button.hidden = this.#viewport.hidden || this.#motion.matches || !(state.animation === 'walk' || state.talking || this.hasAttribute('showcase'));
		if (!this.isConnected || this.#viewport.hidden || document.hidden || this.#motion.matches || state.paused) { return; }
		const interval = Math.max(50, integer(this.getAttribute('interval'), 150, 2000));
		if (state.animation !== 'walk' && !state.talking && !this.hasAttribute('showcase')) { return; }
		this.#timer = window.setInterval(() => {
			this.#step++;
			this.#elapsed += interval;
			if (this.hasAttribute('showcase') && this.#elapsed >= Math.max(150, integer(this.getAttribute('showcase-duration'), 2400, 60000))) {
				this.#elapsed = 0;
				this.#step = 0;
				this.#scene++;
				const available = expressions.filter((name) => {
					const url = this.#url(this.#emotes[name]?.emoteSheet || '');
					return name === 'neutral' || (url && this.#images.get(url) !== null);
				});
				// Hold each face for an idle, walking, and talking pose. Reflect it
				// in HTML so consumers can inspect the state without private APIs.
				this.#cycling = true;
				this.setAttribute('expression', available[Math.floor(this.#scene / 3) % available.length]);
				this.setAttribute('direction', directions[Math.floor(this.#scene / 3) % directions.length]);
				this.setAttribute('animation', this.#scene % 3 === 1 ? 'walk' : 'idle');
				this.toggleAttribute('talking', this.#scene % 3 === 2);
				this.#cycling = false;
				this.#emit('actor-change', this.#state());
			}
			this.#draw();
		}, interval);
	}

	/** Only image URLs are accepted; no markup is interpreted from attributes.
	 * @param {string} source */
	#url(source) {
		try {
			const trimmed = source.trim();
			const url = new URL(trimmed, this.baseURI);
			return trimmed && ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
		} catch { return ''; }
	}

	/** @param {string} source */
	#image(source) {
		const url = this.#url(source);
		if (!url) { return null; }
		if (!this.#images.has(url)) {
			const image = new Image();
			image.alt = '';
			image.referrerPolicy = 'no-referrer';
			image.decoding = 'async';
			this.#images.set(url, image);
			image.onload = () => {
				if (this.#images.get(url) !== image || !this.isConnected) { return; }
				this.#refresh();
				this.#emit('actor-load', { src: url });
			};
			image.onerror = () => {
				if (this.#images.get(url) !== image) { return; }
				this.#images.set(url, null);
				if (this.isConnected) {
					this.#refresh();
					this.#emit('actor-error', { reason: 'Sprite image unavailable', src: url });
				}
			};
			image.src = url;
		}
		const image = this.#images.get(url);
		return image?.complete && image.naturalWidth ? image : null;
	}

	#draw() {
		const state = this.#state();
		const variant = this.#emotes[state.expression];
		const openMouth = state.talking && this.#step % 2 === 1 && !this.#motion.matches;
		const talk = openMouth && variant?.talkSheet ? this.#image(variant.talkSheet) : null;
		const emote = talk || (variant?.emoteSheet ? this.#image(variant.emoteSheet) : null);
		const source = this.getAttribute('src');
		const image = emote || this.#image(source || this.#record?.src || '') || (!source ? this.#image(generic) : null);
		// Shadow stylesheets don't block paint. Keep the fallback visible until
		// the stylesheet can size and clip the sheet to a single frame.
		if (!image || !this.#styled) {
			this.#viewport.hidden = true; this.#slot.hidden = false; this.#button.hidden = true;
			return;
		}
		// Emotes always use the standard 3x4 grid, even for a custom base sheet.
		const standardGrid = emote || image.src === generic;
		const columns = standardGrid ? 3 : Math.max(1, integer(this.getAttribute('columns'), this.#record?.columns ?? 3, 16));
		const rows = standardGrid ? 4 : Math.max(1, integer(this.getAttribute('rows'), this.#record?.rows ?? 4, 16));
		const sequence = [...Array(columns).keys(), ...Array.from({ length: Math.max(0, columns - 2) }, (_, index) => { return columns - 2 - index; })];
		const idle = Math.min(1, columns - 1);
		let frame = idle;
		if (this.hasAttribute('frame')) { frame = integer(this.getAttribute('frame'), idle, columns - 1); }
		else if (state.animation === 'walk' && !this.#motion.matches) { frame = sequence[this.#step % sequence.length]; }
		const row = Math.min(directions.indexOf(state.direction), rows - 1);
		image.style.width = `${columns * 100}%`;
		image.style.height = `${rows * 100}%`;
		image.style.transform = `translate(${(-frame * 100) / columns}%, ${(-row * 100) / rows}%)`;
		this.#viewport.style.aspectRatio = `${image.naturalWidth / columns} / ${image.naturalHeight / rows}`;
		this.#viewport.setAttribute('aria-label', this.getAttribute('label') || 'RPG character');
		if (this.#viewport.firstChild !== image) { this.#viewport.replaceChildren(image); }
		this.#viewport.hidden = false; this.#slot.hidden = true;
	}

	/** @param {string} name @param {object} detail */
	#emit(name, detail) {
		/** @internal Event names and payloads are documented on the class. */
		this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
	}
}
