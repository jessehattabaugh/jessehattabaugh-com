/** Portable renderer for rpg.actor sheets. No site imports or account writes.
 * Sheet contract: https://rpg.actor/dev-guide#pc-playback and #pc-emotes.
 */
export const expressions = Object.freeze(['neutral', 'blink', 'happy', 'sad', 'angry', 'silly', 'tired', 'bruh', 'pout']);
export const directions = Object.freeze(['down', 'left', 'right', 'up']);

/** @param {string | null} value @param {number} fallback @param {number} max */
function integer(value, fallback, max) {
	const number = Number(value);
	return value !== null && value.trim() !== '' && Number.isInteger(number) && number >= 0 && number <= max ? number : fallback;
}

/** State flows through attributes; lifecycle owns every timer and listener. */
export class RpgActor extends HTMLElement {
	static observedAttributes = ['src', 'emotes', 'columns', 'rows', 'animation', 'direction', 'expression', 'talking', 'paused', 'showcase', 'showcase-duration', 'interval', 'frame', 'label'];
	#root = this.attachShadow({ mode: 'open' });
	#viewport = document.createElement('span');
	#slot = document.createElement('slot');
	#button = document.createElement('button');
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
		const style = document.createElement('style');
		style.textContent = `:host{display:inline-flex;flex-direction:column;align-items:center;gap:.5rem;max-width:100%}
			span{display:block;position:relative;overflow:hidden;width:var(--rpg-actor-size,144px);max-width:100%;aspect-ratio:1;image-rendering:pixelated}
			img{position:absolute;inset:0 auto auto 0;max-width:none;display:block}
			button{font:inherit;color:inherit;background:transparent;border:1px solid currentColor;border-radius:.4rem;padding:.5rem .75rem;min-height:44px;cursor:pointer}
			button:focus-visible{outline:3px solid currentColor;outline-offset:3px}
			[hidden]{display:none!important}`;
		this.#viewport.setAttribute('role', 'img');
		this.#viewport.setAttribute('part', 'sprite');
		this.#viewport.hidden = true;
		this.#button.type = 'button';
		this.#button.setAttribute('part', 'controls');
		this.#button.hidden = true;
		this.#button.addEventListener('click', () => { this.toggleAttribute('paused'); });
		this.#root.append(style, this.#slot, this.#viewport, this.#button);
	}

	connectedCallback() {
		this.#motion.addEventListener('change', this.#refresh);
		document.addEventListener('visibilitychange', this.#refresh);
		this.#parseEmotes();
		this.#refresh();
	}

	disconnectedCallback() {
		clearInterval(this.#timer);
		this.#motion.removeEventListener('change', this.#refresh);
		document.removeEventListener('visibilitychange', this.#refresh);
	}

	/** @param {string} name @param {string | null} before @param {string | null} after */
	attributeChangedCallback(name, before, after) {
		if (before === after || this.#cycling) { return; }
		if (name === 'src') {
			this.#images.clear();
		} else if (name === 'emotes') {
			const baseUrl = this.#url(this.getAttribute('src') || '');
			const baseImage = baseUrl ? this.#images.get(baseUrl) : null;
			this.#images.clear();
			if (baseImage) { this.#images.set(baseUrl, baseImage); }
		}
		if (name !== 'paused' && name !== 'label') { this.#step = 0; this.#elapsed = 0; }
		if (!this.isConnected) { return; }
		if (name === 'emotes') { this.#parseEmotes(); }
		this.#refresh();
		this.#emit('actor-change', this.#state());
	}

	#parseEmotes() {
		this.#emotes = {};
		try {
			const value = JSON.parse(this.getAttribute('emotes') || '{}');
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
		this.#button.textContent = state.paused ? 'Resume animation' : 'Pause animation';
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
		const image = emote || this.#image(this.getAttribute('src') || '');
		if (!image) {
			this.#viewport.hidden = true; this.#slot.hidden = false; this.#button.hidden = true;
			return;
		}
		// Emotes always use the standard 3x4 grid, even for a custom base sheet.
		const columns = emote ? 3 : Math.max(1, integer(this.getAttribute('columns'), 3, 16));
		const rows = emote ? 4 : Math.max(1, integer(this.getAttribute('rows'), 4, 16));
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
		this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
	}
}
