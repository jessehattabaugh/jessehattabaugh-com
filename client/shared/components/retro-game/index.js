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

/** A logical pixel viewport. Camera offsets flow to its direct bitmap layers. */
export class RetroScreen extends HTMLElement {
	static observedAttributes = ['camera-x', 'camera-y'];
	#children = new MutationObserver(() => { this.#sync(); });

	connectedCallback() {
		this.#children.observe(this, { childList: true });
		this.#sync();
	}

	disconnectedCallback() { this.#children.disconnect(); }
	attributeChangedCallback() { this.#sync(); }

	#sync() {
		if (!this.isConnected) { return; }
		for (const layer of this.querySelectorAll(':scope > retro-layer')) {
			for (const name of RetroScreen.observedAttributes) {
				layer.setAttribute(name, String(number(this, name, 0)));
			}
		}
	}
}

/** A repeating bitmap, sampled as a whole, by row, or by column. */
export class RetroLayer extends HTMLElement {
	static observedAttributes = ['mode', 'width', 'height', 'scroll-x', 'scroll-y', 'camera-x', 'camera-y',
		'factor', 'scale', 'angle', 'amplitude', 'phase'];
	#canvas = document.createElement('canvas');
	#frame = 0;
	#children = new MutationObserver(() => { this.#queue(); });

	constructor() {
		super();
		this.#canvas.setAttribute('aria-hidden', 'true');
		this.#canvas.hidden = true;
	}

	connectedCallback() {
		this.#children.observe(this, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'srcset', 'sizes'] });
		this.addEventListener('load', this.#queue, true);
		this.addEventListener('error', this.#queue, true);
		this.#queue();
	}

	disconnectedCallback() {
		this.#children.disconnect();
		this.removeEventListener('load', this.#queue, true);
		this.removeEventListener('error', this.#queue, true);
		cancelAnimationFrame(this.#frame);
		this.#frame = 0;
	}

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
		const context = this.#canvas.getContext('2d');
		if (!(image instanceof HTMLImageElement) || !image.complete || !image.naturalWidth || !context) {
			this.#canvas.hidden = true;
			return;
		}
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

/** CSS positions and scales an authored bitmap in logical screen pixels. */
export class RetroSprite extends HTMLElement {}

/** CSS arranges authored tiles in row-major order. */
export class RetroTilemap extends HTMLElement {}

/** A named scene. The parent game reflects selection with the active attribute. */
export class RetroScene extends HTMLElement {}

/** Select a direct scene by its fragment, or request a scene by setting the scene attribute. */
export class RetroGame extends HTMLElement {
	static observedAttributes = ['scene', 'start'];
	#active = '';
	#reflecting = false;
	#children = new MutationObserver((records) => {
		if (records.some(({ target, type }) => {
			return target === this || (type === 'attributes' && target.parentNode === this);
		})) { this.#fromLocation(); }
	});

	connectedCallback() {
		this.#children.observe(this, { childList: true, subtree: true, attributes: true, attributeFilter: ['id'] });
		window.addEventListener('hashchange', this.#fromLocation);
		this.#fromLocation();
	}

	disconnectedCallback() {
		this.#children.disconnect();
		window.removeEventListener('hashchange', this.#fromLocation);
		this.removeAttribute('data-retro-ready');
		this.#active = '';
	}

	/** @param {string} name @param {string | null} _previous @param {string | null} value */
	attributeChangedCallback(name, _previous, value) {
		if (!this.isConnected || this.#reflecting || !this.hasAttribute('data-retro-ready')) { return; }
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
		return Array.from(this.querySelectorAll(':scope > retro-scene[id]')).filter((scene) => { return scene.id; });
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
		this.setAttribute('data-retro-ready', '');
		if (previous && this.#active && this.#active !== previous) {
			if (focus && selected instanceof HTMLElement) { selected.focus({ preventScroll: true }); }
			emit(this, 'retro-scene-change', { scene: this.#active, previous });
		}
	}
}

/** Native fragment links report actions and can opt into local keyboard shortcuts. */
export class RetroMenu extends HTMLElement {
	connectedCallback() {
		this.addEventListener('click', this.#click);
		this.addEventListener('keydown', this.#key);
	}

	disconnectedCallback() {
		this.removeEventListener('click', this.#click);
		this.removeEventListener('keydown', this.#key);
	}

	/** @param {MouseEvent} event */
	#click = (event) => {
		if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) { return; }
		const link = event.target instanceof Element && event.target.closest('a[href^="#"]');
		if (!(link instanceof HTMLAnchorElement) || link.closest('retro-menu') !== this) { return; }
		const scene = link.getAttribute('href')?.slice(1);
		if (scene && !emit(link, 'retro-action', { scene }, true)) { event.preventDefault(); }
	};

	/** @param {KeyboardEvent} event */
	#key = (event) => {
		if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) { return; }
		if (!(event.target instanceof HTMLAnchorElement) || event.target.closest('retro-menu') !== this) { return; }
		const link = Array.from(this.querySelectorAll('a[href^="#"][data-key]')).find((candidate) => {
			return candidate instanceof HTMLAnchorElement && candidate.closest('retro-menu') === this && candidate.dataset.key === event.key && candidate.getClientRects().length;
		});
		if (link instanceof HTMLAnchorElement) {
			event.preventDefault();
			link.click();
		}
	};
}

/** Bridge the open attribute to a native dialog and report its native state. */
export class RetroModal extends HTMLElement {
	static observedAttributes = ['open'];
	/** @type {HTMLDialogElement | null} */
	#dialog = null;
	#open = false;
	#reflecting = false;
	#children = new MutationObserver(() => { this.#bind(); });

	connectedCallback() {
		this.#children.observe(this, { childList: true });
		this.#bind();
	}

	disconnectedCallback() {
		this.#children.disconnect();
		this.#dialog?.removeEventListener('toggle', this.#toggle);
		this.#dialog = null;
	}

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
		emit(this, 'retro-modal-change', { open });
	};
}

for (const [tag, element] of Object.entries({
	'retro-screen': RetroScreen, 'retro-layer': RetroLayer, 'retro-sprite': RetroSprite, 'retro-tilemap': RetroTilemap,
	'retro-game': RetroGame, 'retro-scene': RetroScene, 'retro-menu': RetroMenu, 'retro-modal': RetroModal,
})) {
	if (!customElements.get(tag)) { customElements.define(tag, element); }
}
