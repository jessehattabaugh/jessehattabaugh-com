import { clamp, report, value } from './world-data.js';

/** Keyboard, held pointer buttons, and the first available controller share one event contract. */
export class GameInput extends HTMLElement {
	#keys = new Set();
	/** @type {Map<number, string>} */
	#pointers = new Map();
	#timer = 0;
	#pad = -1;
	#pauseDown = false;
	#startDown = false;
	#last = '';
	#source = 'Keyboard / touch';

	connectedCallback() {
		this.addEventListener('keydown', this.#key);
		this.addEventListener('keyup', this.#key);
		this.addEventListener('pointerdown', this.#pointerDown);
		this.addEventListener('pointerup', this.#pointerUp);
		this.addEventListener('pointercancel', this.#pointerUp);
		this.addEventListener('lostpointercapture', this.#pointerUp);
		this.addEventListener('click', this.#click);
		this.addEventListener('focusout', this.#focusOut);
		window.addEventListener('blur', this.#clear);
		window.addEventListener('gamepadconnected', this.#poll);
		window.addEventListener('gamepaddisconnected', this.#poll);
		// Discovery also runs at rest so the controller can launch a game.
		this.#timer = window.setInterval(this.#poll, 50);
		this.#poll();
	}

	disconnectedCallback() {
		clearInterval(this.#timer);
		this.removeEventListener('keydown', this.#key);
		this.removeEventListener('keyup', this.#key);
		this.removeEventListener('pointerdown', this.#pointerDown);
		this.removeEventListener('pointerup', this.#pointerUp);
		this.removeEventListener('pointercancel', this.#pointerUp);
		this.removeEventListener('lostpointercapture', this.#pointerUp);
		this.removeEventListener('click', this.#click);
		this.removeEventListener('focusout', this.#focusOut);
		window.removeEventListener('blur', this.#clear);
		window.removeEventListener('gamepadconnected', this.#poll);
		window.removeEventListener('gamepaddisconnected', this.#poll);
		this.#keys.clear();
		this.#pointers.clear();
		this.#pad = -1;
		this.#last = '';
	}

	/** @param {KeyboardEvent} event */
	#key = (event) => {
		if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement ||
			event.altKey || event.ctrlKey || event.metaKey) { return; }
		const key = event.key.toLowerCase();
		const actions = ['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's', ' ', 'p', 'escape'];
		if (!actions.includes(key)) { return; }
		event.preventDefault();
		this.#source = 'Keyboard / touch';
		if (event.type === 'keydown') { this.#keys.add(key); } else { this.#keys.delete(key); }
		if (event.type === 'keydown' && !event.repeat && ['p', 'escape'].includes(key)) { this.#send('pause'); }
		this.#poll();
	};

	/** @param {PointerEvent} event */
	#pointerDown = (event) => {
		const button = event.target instanceof Element ? event.target.closest('button[data-action]') : null;
		if (!(button instanceof HTMLButtonElement) || button.closest('game-input') !== this) { return; }
		const action = button.dataset.action ?? '';
		if (!['left', 'right', 'up', 'down', 'fire'].includes(action)) { return; }
		this.#pointers.set(event.pointerId, action);
		button.setPointerCapture(event.pointerId);
		this.#poll();
	};

	/** @param {PointerEvent} event */
	#pointerUp = (event) => {
		this.#pointers.delete(event.pointerId);
		this.#poll();
	};

	/** @param {MouseEvent} event */
	#click = (event) => {
		const button = event.target instanceof Element ? event.target.closest('button[data-action]') : null;
		if (!(button instanceof HTMLButtonElement) || button.closest('game-input') !== this) { return; }
		const { action } = button.dataset;
		if (!action) { return; }
		// Click also supports keyboard and assistive-technology button activation.
		this.#send(action);
	};

	/** @param {FocusEvent} event */
	#focusOut = (event) => {
		if (!(event.relatedTarget instanceof Node) || !this.contains(event.relatedTarget)) { this.#clear(); }
	};

	#clear = () => {
		this.#keys.clear();
		this.#pointers.clear();
		this.#poll();
	};

	#poll = () => {
		if (document.hidden) { return; }
		/** @type {(Gamepad | null)[]} */
		let pads = [];
		try { pads = Array.from(navigator.getGamepads?.() ?? []); } catch { /* Keyboard and touch remain available when the API is blocked. */ }
		let pad = pads.find((candidate) => { return candidate?.connected && candidate.index === this.#pad; });
		pad ??= pads.find((candidate) => { return candidate?.connected; });
		const previous = this.#pad;
		this.#pad = pad?.index ?? -1;
		if (previous !== this.#pad) {
			this.#pauseDown = false;
			this.#startDown = false;
			report(this, 'game-controller-change', { index: this.#pad, connected: Boolean(pad), name: pad?.id ?? 'Keyboard / touch', mapping: pad?.mapping ?? '' });
		}
		if (pad) {
			const start = pad.buttons[9]?.pressed ?? false;
			const launch = pad.buttons[0]?.pressed ?? false;
			if (start && !this.#pauseDown) { this.#send('pause'); }
			if (launch && !this.#startDown) { this.#send('start'); }
			this.#pauseDown = start;
			this.#startDown = launch;
		}
		this.#send();
	};

	/** @param {string} [command] */
	#send(command) {
		const held = new Set([...this.#keys, ...this.#pointers.values()]);
		let x = Number(held.has('arrowright') || held.has('d') || held.has('right')) - Number(held.has('arrowleft') || held.has('a') || held.has('left'));
		let y = Number(held.has('arrowup') || held.has('w') || held.has('up')) - Number(held.has('arrowdown') || held.has('s') || held.has('down'));
		let fire = held.has(' ') || held.has('fire');
		let source = this.#source;
		let pad;
		try { pad = navigator.getGamepads?.()[this.#pad]; } catch { /* Use the native controls. */ }
		if (pad?.connected) {
			const deadzone = value(this, 'deadzone', 0.18, 0, 0.9);
			const axis = (/** @type {number} */ input) => {
				return Math.abs(input) > deadzone ? Math.sign(input) * (Math.abs(input) - deadzone) / (1 - deadzone) : 0;
			};
			x = axis(pad.axes[0] ?? 0) + Number(pad.buttons[15]?.pressed ?? false) - Number(pad.buttons[14]?.pressed ?? false);
			y = -axis(pad.axes[1] ?? 0) + Number(pad.buttons[12]?.pressed ?? false) - Number(pad.buttons[13]?.pressed ?? false);
			fire = Boolean(pad.buttons[Math.floor(value(this, 'fire-button', 0, 0, 31))]?.pressed || pad.buttons[7]?.pressed);
			source = `Gamepad · ${pad.id}`;
		}
		const detail = { x: clamp(x, -1, 1), y: clamp(y, -1, 1), fire, source, command };
		const signature = JSON.stringify(detail);
		if (signature === this.#last && !command) { return; }
		this.#last = signature;
		report(this, 'game-input', detail);
	}
}
