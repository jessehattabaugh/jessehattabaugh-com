import { clamp, value } from './world-data.js';
/** @import { Bitmap, World } from './world-data.js' */

/** Updates world coordinates. CSS owns projection, tile painting, palette and sheet animation. */
export class WorldRenderer {
	/** @type {Map<string, Bitmap>} */
	assets = new Map();
	/** @type {HTMLElement} */
	#screen;
	/** @type {Map<object, HTMLElement>} */
	#nodes = new Map();

	/** @param {HTMLElement} screen */
	constructor(screen) { this.#screen = screen; }

	/** @param {HTMLElement} root */
	prepare(root) {
		for (const bank of root.querySelectorAll('retro-tileset[id]')) {
			const image = bank.querySelector(':scope > img');
			if (!(image instanceof HTMLImageElement)) { continue; }
			const tileWidth = Math.floor(value(bank, 'tile-width', 8, 1, 64));
			const tileHeight = Math.floor(value(bank, 'tile-height', 8, 1, 64));
			if (image.naturalWidth % tileWidth || image.naturalHeight % tileHeight) { throw new Error('Pattern bank dimensions must be divisible by tile dimensions.'); }
			const columns = image.naturalWidth / tileWidth;
			this.assets.set(bank.id, { image, tileWidth, tileHeight, columns,
				frames: columns * image.naturalHeight / tileHeight });
		}
	}

	/** @param {World} world @param {boolean} [renderActors] */
	draw(world, renderActors = true) {
		for (const [name, coordinate] of Object.entries(world.camera)) {
			const property = `--camera-${name}`;
			const position = coordinate.toFixed(3);
			if (this.#screen.style.getPropertyValue(property) !== position) { this.#screen.style.setProperty(property, position); }
		}
		const player = world.playerElement;
		this.#position(player, world.player.x, world.player.y - 0.3, 3);
		const bank = this.assets.get(player.getAttribute('tileset') ?? '');
		const frames = Math.floor(value(player, 'frames', bank?.frames ?? 1, 1, 32));
		player.setAttribute('frame', String(clamp(Math.round((world.bank + 1) * (frames - 1) / 2), 0, frames - 1)));
		player.toggleAttribute('invulnerable', world.player.immune > 0);
		if (!renderActors) { return; }

		/** @type {Set<object>} */
		const live = new Set();
		for (const enemy of world.enemies) {
			live.add(enemy);
			const node = this.#node(enemy, enemy.element, 'enemy', world.stage);
			this.#position(node, enemy.x, enemy.y - value(enemy.element, 'size', 1.2, 0.1, 8) / 2, enemy.z);
		}
		/** @type {Array<[Array<{x:number,y:number,z:number}>, string]>} */
		const groups = [[world.shots, 'shot'], [world.bullets, 'projectile'], [world.explosions, 'burst']];
		for (const [entities, kind] of groups) {
			for (const entity of entities) {
				live.add(entity);
				const node = this.#node(entity, null, String(kind), world.stage);
				this.#position(node, entity.x, entity.y, entity.z);
			}
		}
		for (const [entity, node] of this.#nodes) {
			if (!live.has(entity)) { node.remove(); this.#nodes.delete(entity); }
		}
		// Recycle only objects beyond the far plane. Their ground positions stay fixed.
		for (const sprite of world.stage.querySelectorAll(':scope > retro-sprite[actor="scenery"]:not([data-instance])')) {
			if (!(sprite instanceof HTMLElement)) { continue; }
			const spacing = value(sprite, 'spacing', 16, 2, 200);
			const offset = value(sprite, 'offset', 0, 0, 200);
			const copies = Math.ceil(value(world.stage, 'draw-distance', 90, 10, 160) / spacing);
			for (let index = 0; index < copies; index++) {
				const key = `scenery-${sprite.getAttribute('tileset')}-${sprite.getAttribute('x')}-${index}`;
				const id = world.stage.id + key;
				let node = Array.from(world.stage.querySelectorAll(':scope > retro-sprite[data-scenery]')).find((candidate) => { return candidate.getAttribute('data-scenery') === id; });
				if (!(node instanceof HTMLElement)) {
					node = this.#copy(sprite, 'scenery');
					node.setAttribute('data-scenery', id);
					world.stage.append(node);
				}
				const far = (index + 1) * spacing;
				const z = ((far + offset - world.distance) % (copies * spacing) + copies * spacing) % (copies * spacing) + 1;
				if (node instanceof HTMLElement) { this.#position(node, value(sprite, 'x', 4), value(sprite, 'y', 0), z); }
			}
		}
	}

	/** @param {HTMLElement} node @param {number} x @param {number} y @param {number} z */
	#position(node, x, y, z) {
		for (const [name, value] of Object.entries({ x, y, z })) {
			const coordinate = value.toFixed(3);
			if (node.getAttribute(name) !== coordinate) { node.setAttribute(name, coordinate); }
		}
	}

	/** @param {HTMLElement} source @param {string} kind */
	#copy(source, kind) {
		const node = document.createElement('retro-sprite');
		for (const { name, value: content } of source.attributes) { node.setAttribute(name, content); }
		node.removeAttribute('id');
		node.setAttribute('data-instance', kind);
		node.setAttribute('aria-hidden', 'true');
		const image = source.querySelector('img');
		if (image) { node.append(image.cloneNode()); }
		return node;
	}

	/** @param {object} entity @param {HTMLElement | null} source @param {string} kind @param {HTMLElement} parent */
	#node(entity, source, kind, parent) {
		let node = this.#nodes.get(entity);
		if (!node) {
			node = source ? this.#copy(source, kind) : document.createElement('retro-sprite');
			node.setAttribute('data-instance', kind);
			node.setAttribute('aria-hidden', 'true');
			parent.append(node);
			this.#nodes.set(entity, node);
		}
		return node;
	}
}
