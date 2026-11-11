import { clamp, report, value } from './world-data.js';
import { WorldRenderer } from './world-renderer.js';
/** @import { Control, World } from './world-data.js' */

/** Declarative stage, ground, actor and encounter records are consumed by retro-world. */
export class RetroStage extends HTMLElement {}
export class RetroPalette extends HTMLElement {}
export class RetroTileset extends HTMLElement {}
export class RetroTile extends HTMLElement {}

/** Fixed-step forward world simulation. All content and tuning come from descendant attributes. */
export class RetroWorld extends HTMLElement {
	/** @type {World | null} */
	#world = null;
	/** @type {WorldRenderer | null} */
	#renderer = null;
	/** @type {Control} */
	#control = { x: 0, y: 0, fire: false, source: 'Keyboard / touch' };
	/** @type {HTMLElement[]} */
	#stages = [];
	/** @type {Map<HTMLElement, number>} */
	#spawned = new Map();
	#stageIndex = 0;
	#frame = 0;
	#lastFrame = 0;
	#accumulator = 0;
	#cooldown = 0;
	#hudTime = 0;
	#generation = 0;
	#state = 'loading';
	#children = new MutationObserver(() => { void this.#load(); });

	connectedCallback() {
		this.addEventListener('retro-input', this.#input);
		document.addEventListener('visibilitychange', this.#visibility);
		window.addEventListener('blur', this.#pause);
		this.#children.observe(this, { childList: true });
		queueMicrotask(() => { if (this.isConnected) { void this.#load(); } });
	}

	disconnectedCallback() {
		this.#generation++;
		cancelAnimationFrame(this.#frame);
		this.#children.disconnect();
		this.removeEventListener('retro-input', this.#input);
		document.removeEventListener('visibilitychange', this.#visibility);
		window.removeEventListener('blur', this.#pause);
		this.#world = null;
		this.#renderer = null;
		this.removeAttribute('data-world-ready');
	}

	async #load() {
		const generation = ++this.#generation;
		cancelAnimationFrame(this.#frame);
		this.#state = 'loading';
		this.setAttribute('state', 'loading');
		this.#world = null;
		this.#renderer = null;
		this.removeAttribute('data-world-ready');
		this.#buttons(false);
		try {
			const viewport = this.querySelector('retro-screen[data-world-viewport]');
			const player = this.querySelector('retro-screen > retro-sprite[actor="player"]');
			this.#stages = Array.from(this.querySelectorAll('retro-screen > retro-stage')).filter((stage) => { return stage instanceof HTMLElement; });
			if (!(viewport instanceof HTMLElement) || !(player instanceof HTMLElement) || !this.#stages.length) {
				throw new Error('A world screen needs a player sprite and at least one stage.');
			}
			const images = Array.from(this.querySelectorAll('img')).filter((image) => { return !image.hasAttribute('data-world-poster'); });
			await Promise.all(images.map((image) => { return image.decode(); }));
			if (generation !== this.#generation || !this.isConnected) { return; }
			this.#renderer = new WorldRenderer(viewport);
			this.#renderer.prepare(this);
			for (const actor of this.querySelectorAll('retro-sprite[tileset]')) {
				if (!this.#renderer.assets.has(actor.getAttribute('tileset') ?? '')) { throw new Error('Unknown pattern bank reference.'); }
			}
			this.#world = { player: { x: 0, y: 1.1, health: 5, immune: 0 },
				camera: { x: 0, y: 2.565 }, distance: 0, time: 0, bank: 0, score: 0,
				enemies: [], shots: [], bullets: [], explosions: [], stage: this.#stages[0], playerElement: player };
			this.#reset();
			this.setAttribute('data-world-ready', '');
			this.#buttons(true);
			this.#setState('ready', 'Ready to fly. Launch when you are ready.');
			this.#renderer.draw(this.#world, false);
		} catch (error) {
			if (generation !== this.#generation || !this.isConnected) { return; }
			console.error('World could not load', error);
			this.#state = 'error';
			this.setAttribute('state', 'error');
			this.#status('Full controls could not load. The native course controls are still available.');
			report(this, 'retro-world-error', { reason: 'assets-or-definitions' });
		}
	}

	#reset() {
		const world = this.#world;
		if (!world) { return; }
		const player = world.playerElement;
		world.player = { x: value(player, 'start-x', 0), y: value(player, 'start-y', 1.1),
			health: Math.floor(value(player, 'max-health', 5, 1, 99)), immune: 0 };
		this.#move(world.player.x, world.player.y);
		world.camera = { x: world.player.x * 0.32, y: 2.4 + world.player.y * 0.15 };
		world.time = 0;
		world.score = 0;
		this.#cooldown = 0;
		this.#accumulator = 0;
		this.#setStage(0);
		this.#hud();
	}

	/** @param {number} index */
	#setStage(index) {
		const world = this.#world;
		if (!world) { return; }
		this.#stageIndex = index;
		world.stage = this.#stages[index];
		world.distance = 0;
		world.enemies = [];
		world.shots = [];
		world.bullets = [];
		world.explosions = [];
		this.#spawned.clear();
		for (const instance of this.querySelectorAll('retro-sprite[data-instance]')) { instance.remove(); }
		for (const stage of this.#stages) { stage.toggleAttribute('active', stage === world.stage); }
		this.setAttribute('stage', world.stage.id);
		report(world.stage, 'retro-stage-change', { stage: world.stage.id, index, name: world.stage.getAttribute('name') ?? world.stage.id });
		this.#status(world.stage.getAttribute('name') ?? world.stage.id);
		this.#hud();
	}

	/** @param {Event} event */
	#input = (event) => {
		if (!(event instanceof CustomEvent) || event.target instanceof Element && event.target.closest('retro-world') !== this) { return; }
		const detail = /** @type {Control} */ (event.detail ?? {});
		if (!Number.isFinite(detail.x) || !Number.isFinite(detail.y) || typeof detail.fire !== 'boolean') { return; }
		this.#control = { x: clamp(detail.x, -1, 1), y: clamp(detail.y, -1, 1), fire: detail.fire, source: String(detail.source) };
		const source = this.querySelector('[data-world-controller]');
		if (source) { source.textContent = this.#control.source; }
		switch (detail.command) {
			case 'start':
				if (['ready', 'won', 'lost', 'paused'].includes(this.#state)) { this.#launch(); }
				break;
			case 'restart':
				if (this.#world) { this.#reset(); this.#launch(); }
				break;
			case 'pause':
				if (this.#state === 'playing') { this.#pause(); } else { this.#launch(); }
				break;
			case 'fire':
				if (this.#state === 'playing') { this.#shoot(); }
				break;
			case 'left': case 'right': case 'up': case 'down':
				if (this.#state === 'playing' && this.#world) {
					this.#move(this.#world.player.x + Number(detail.command === 'right') * 0.18 - Number(detail.command === 'left') * 0.18,
						this.#world.player.y + Number(detail.command === 'up') * 0.18 - Number(detail.command === 'down') * 0.18);
				}
				break;
		}
	};

	#launch() {
		if (!this.#world || !this.#renderer || !['ready', 'paused', 'won', 'lost'].includes(this.#state)) { return; }
		if (this.#state === 'won' || this.#state === 'lost') { this.#reset(); }
		this.#lastFrame = 0;
		this.#setState('playing', this.#world.stage.getAttribute('name') ?? 'Flying');
		const viewport = this.querySelector('[data-world-viewport]');
		if (viewport instanceof HTMLElement) { viewport.focus({ preventScroll: true }); }
		cancelAnimationFrame(this.#frame);
		this.#frame = requestAnimationFrame(this.#tick);
	}

	#pause = () => {
		if (this.#state !== 'playing') { return; }
		cancelAnimationFrame(this.#frame);
		this.#setState('paused', 'Paused. Resume when you are ready.');
	};

	#visibility = () => { if (document.hidden) { this.#pause(); } };

	/** @param {number} now */
	#tick = (now) => {
		if (!this.#world || !this.#renderer || this.#state !== 'playing') { return; }
		this.#accumulator += this.#lastFrame ? Math.min(0.1, (now - this.#lastFrame) / 1000) : 0;
		this.#lastFrame = now;
		// Capping catch-up work prevents background tabs and slow frames from jumping past collisions.
		while (this.#accumulator >= 1 / 60 && this.#state === 'playing') {
			this.#step(1 / 60);
			this.#accumulator -= 1 / 60;
		}
		this.#renderer.draw(this.#world);
		if (this.#state === 'playing') { this.#frame = requestAnimationFrame(this.#tick); }
	};

	/** @param {number} dt */
	#step(dt) {
		const world = this.#world;
		if (!world) { return; }
		world.time += dt;
		const speed = value(world.stage, 'speed', 18, 1, 60);
		world.distance += speed * dt;
		const input = this.#control;
		const diagonal = Math.max(1, Math.hypot(input.x, input.y));
		const movement = value(world.playerElement, 'speed', 3.2, 0.1, 12) * dt;
		this.#move(world.player.x + input.x / diagonal * movement, world.player.y + input.y / diagonal * movement);
		world.player.immune = Math.max(0, world.player.immune - dt);
		world.camera.x += (world.player.x * 0.32 - world.camera.x) * (1 - Math.exp(-dt * 5));
		world.camera.y += (2.4 + world.player.y * 0.15 - world.camera.y) * (1 - Math.exp(-dt * 5));
		world.bank += (input.x - world.bank) * (1 - Math.exp(-dt * 10));
		this.#cooldown = Math.max(0, this.#cooldown - dt);
		if (input.fire) { this.#shoot(); }
		this.#spawn();
		this.#enemies(dt, speed);
		this.#projectiles(dt, speed);
		world.explosions = world.explosions.filter((burst) => { burst.age += dt; return burst.age < 0.4; });
		this.#hudTime += dt;
		if (this.#hudTime >= 0.1) { this.#hudTime = 0; this.#hud(); }
		if (this.#state !== 'playing') { return; }
		if (world.distance >= value(world.stage, 'length', 480, 10, 10000)) {
			if (this.#stageIndex + 1 === this.#stages.length) {
				this.#setState('won', 'Flight complete. All sectors cleared.');
			} else {
				const repair = value(this.#stages[this.#stageIndex + 1], 'repair', 1, 0, 99);
				world.player.health = Math.min(value(world.playerElement, 'max-health', 5, 1, 99), world.player.health + repair);
				this.#setStage(this.#stageIndex + 1);
			}
		}
	}

	/** Authored bounds support ground-bound and airborne actors with the same input.
	 * @param {number} x @param {number} y */
	#move(x, y) {
		const world = this.#world;
		if (!world) { return; }
		const player = world.playerElement;
		const minX = value(player, 'min-x', -2.7, -10, 10);
		const minY = value(player, 'min-y', 0.3, -2, 10);
		world.player.x = clamp(x, minX, Math.max(minX, value(player, 'max-x', 2.7, -10, 10)));
		world.player.y = clamp(y, minY, Math.max(minY, value(player, 'max-y', 2.4, -2, 10)));
	}

	#spawn() {
		const world = this.#world;
		if (!world) { return; }
		for (const wave of world.stage.querySelectorAll(':scope > retro-sprite[actor="enemy"]:not([data-instance])')) {
			if (!(wave instanceof HTMLElement)) { continue; }
			let count = this.#spawned.get(wave) ?? 0;
			const total = Math.floor(value(wave, 'count', 1, 0, 50));
			const at = value(wave, 'at', 30, 0, 10000);
			const interval = value(wave, 'interval', 35, 1, 1000);
			while (count < total && world.distance >= at + count * interval) {
				const x = value(wave, 'x', 0, -8, 8) + ((count % 2) * 2 - 1) * value(wave, 'spread', 0, 0, 5);
				const y = value(wave, 'y', 1.1, 0.3, 5);
				if (world.enemies.length < 64) {
					world.enemies.push({ element: wave, x, y, z: value(wave, 'z', 55, 8, 160),
						originX: x, originY: y, age: 0, health: Math.floor(value(wave, 'health', 1, 1, 20)),
						nextShot: value(wave, 'fire-delay', 1.2, 0.1, 20) });
				}
				count++;
			}
			this.#spawned.set(wave, count);
		}
	}

	/** @param {number} dt @param {number} speed */
	#enemies(dt, speed) {
		const world = this.#world;
		if (!world) { return; }
		for (const enemy of world.enemies) {
			const wave = enemy.element;
			enemy.age += dt;
			enemy.z -= (speed + value(wave, 'speed', 0, -0.9 * speed, 40)) * dt;
			const behavior = wave.getAttribute('behavior');
			if (behavior === 'sine') {
				enemy.x = enemy.originX + Math.sin(enemy.age * value(wave, 'frequency', 2, 0, 8)) * value(wave, 'sway', 1, 0, 4);
				enemy.y = enemy.originY + Math.sin(enemy.age * 3) * 0.2;
			} else if (behavior === 'dive') {
				enemy.x = enemy.originX + Math.sin(enemy.age * 2) * value(wave, 'sway', 0.5, 0, 4);
				enemy.y = Math.max(0.3, enemy.originY - enemy.age * value(wave, 'dive-rate', 0.45, 0, 2));
			} else if (behavior === 'chase') {
				enemy.x += (world.player.x - enemy.x) * dt * value(wave, 'tracking', 0.8, 0, 3);
				enemy.y += (world.player.y - enemy.y) * dt * value(wave, 'tracking', 0.8, 0, 3);
			}
			const fireRate = value(wave, 'fire-rate', 0, 0, 10);
			if (fireRate && enemy.age >= enemy.nextShot && enemy.z > 6 && world.bullets.length < 96) {
				const shotSpeed = value(wave, 'shot-speed', 16, 4, 60);
				const travel = (enemy.z - 3) / (shotSpeed + speed);
				world.bullets.push({ x: enemy.x, y: enemy.y, z: enemy.z,
					vx: (world.player.x - enemy.x) / travel, vy: (world.player.y - enemy.y) / travel, speed: shotSpeed });
				enemy.nextShot = enemy.age + fireRate;
			}
			if (Math.abs(enemy.z - 3) < 0.8 && Math.hypot(enemy.x - world.player.x, enemy.y - world.player.y) <
				value(wave, 'radius', 0.3, 0.05, 2) + value(world.playerElement, 'radius', 0.18, 0.05, 1)) {
				this.#hurt('enemy');
				enemy.z = -1;
			}
		}
		world.enemies = world.enemies.filter((enemy) => { return enemy.z > 0.5 && enemy.health > 0; });
	}

	#shoot() {
		const world = this.#world;
		if (!world || this.#cooldown > 0) { return; }
		this.#cooldown = value(world.playerElement, 'fire-rate', 0.16, 0.06, 2);
		world.shots.push({ x: world.player.x, y: world.player.y, z: 3.8, vx: 0, vy: 0,
			speed: value(world.playerElement, 'shot-speed', 70, 20, 180) });
		report(world.playerElement, 'retro-shot', { x: world.player.x, y: world.player.y });
	}

	/** @param {number} dt @param {number} speed */
	#projectiles(dt, speed) {
		const world = this.#world;
		if (!world) { return; }
		for (const shot of world.shots) {
			const previousZ = shot.z;
			shot.z += shot.speed * dt;
			const enemy = world.enemies.find((target) => {
				const radius = value(target.element, 'radius', 0.3, 0.05, 2);
				return target.health > 0 && target.z >= previousZ - 1 && target.z <= shot.z + 1 &&
					Math.hypot(shot.x - target.x, shot.y - target.y) < radius + 0.14;
			});
			if (!enemy) { continue; }
			shot.z = 200;
			enemy.health--;
			if (enemy.health === 0) {
				world.score += Math.round(value(enemy.element, 'score', 100, 0, 10000));
				world.explosions.push({ x: enemy.x, y: enemy.y, z: enemy.z, age: 0 });
				this.#hud();
			}
			report(enemy.element, 'retro-enemy-hit', { remaining: enemy.health, destroyed: enemy.health === 0, score: world.score });
		}
		world.shots = world.shots.filter((shot) => { return shot.z < 160; });
		for (const bullet of world.bullets) {
			const previousZ = bullet.z;
			bullet.z -= (bullet.speed + speed) * dt;
			bullet.x += bullet.vx * dt;
			bullet.y += bullet.vy * dt;
			if (previousZ >= 3 && bullet.z <= 3 && Math.hypot(bullet.x - world.player.x, bullet.y - world.player.y) <
				value(world.playerElement, 'radius', 0.18, 0.05, 1) + 0.16) {
				this.#hurt('projectile');
				bullet.z = -1;
			}
		}
		world.bullets = world.bullets.filter((bullet) => { return bullet.z > 0.5; });
	}

	/** @param {string} source */
	#hurt(source) {
		const world = this.#world;
		if (!world || world.player.immune > 0 || this.#state !== 'playing') { return; }
		world.player.health = Math.max(0, world.player.health - 1);
		world.player.immune = value(world.playerElement, 'recovery', 1.2, 0.1, 5);
		report(world.playerElement, 'retro-player-hit', { health: world.player.health, source });
		this.#status(`Hit. ${world.player.health} shield remaining.`);
		this.#hud();
		if (!world.player.health) { this.#setState('lost', 'Ship lost. Fly again to restart from the first sector.'); }
	}

	/** @param {boolean} enabled */
	#buttons(enabled) {
		for (const button of this.querySelectorAll('retro-input button[data-action]')) {
			if (button instanceof HTMLButtonElement) { button.disabled = !enabled; }
		}
	}

	/** @param {string} state @param {string} message */
	#setState(state, message) {
		this.#state = state;
		this.setAttribute('state', state);
		this.#status(message);
		const pause = this.querySelector('button[data-action="pause"]');
		if (pause instanceof HTMLButtonElement) {
			pause.textContent = state === 'paused' ? 'Resume' : 'Pause';
			pause.disabled = !['playing', 'paused'].includes(state);
		}
		const launch = this.querySelector('button[data-action="start"]');
		if (launch instanceof HTMLButtonElement) {
			launch.hidden = ['playing', 'paused'].includes(state);
			launch.textContent = ['won', 'lost'].includes(state) ? 'Fly again' : 'Launch';
		}
		this.#hud();
		report(this, 'retro-world-change', { state, score: this.#world?.score ?? 0, health: this.#world?.player.health ?? 0, stage: this.#world?.stage.id ?? '' });
	}

	/** @param {string} text */
	#status(text) {
		const status = this.querySelector('[data-world-status]');
		if (status) { status.textContent = text; }
	}

	#hud() {
		const world = this.#world;
		if (!world) { return; }
		const fields = {
			shield: String(world.player.health), score: String(world.score).padStart(6, '0'),
			sector: world.stage.getAttribute('name') ?? world.stage.id,
			progress: `${Math.min(100, Math.floor(world.distance / value(world.stage, 'length', 480, 10, 10000) * 100))}%`,
		};
		for (const [name, text] of Object.entries(fields)) {
			const output = this.querySelector(`[data-world-${name}]`);
			if (output) { output.textContent = text; }
		}
		world.playerElement.setAttribute('position-x', world.player.x.toFixed(3));
		world.playerElement.setAttribute('position-y', world.player.y.toFixed(3));
		world.playerElement.setAttribute('health', String(world.player.health));
		this.setAttribute('score', String(world.score));
	}
}
