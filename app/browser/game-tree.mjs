import Matter from 'matter-js';
import { getWalls } from './bodies.mjs';
import { GameBase } from './game-base.mjs';
const { Composite, Body, Bodies } = Matter;

export class GameTree extends GameBase {
	constructor() {
		super();
		// You can add any tree-specific properties here if needed
	}

	connectedCallback() {
		super.connectedCallback();
		// After engine startup, draw the tree structure
		this.spawnTree();
	}

	// Optionally override to provide walls if needed, else reuse getWalls if desired
	addWalls(width, height) {
		return getWalls(width, height);
	}

	spawnTree() {
		// Create a simple tree: a trunk and several branches
		const bodies = [];
		const { width, height } = this._render.options;

		// Create trunk: a tall thin rectangle centered at the bottom
		const trunk = Bodies.rectangle(width / 2, height * 0.75, 20, 150, { isStatic: true, render: { fillStyle: 'brown' } });
		bodies.push(trunk);

		// Create branches: several rectangles coming out from the trunk
		for (let i = -2; i <= 2; i++) {
			const branch = Bodies.rectangle(width / 2 + i * 30, height * 0.75 - 80, 100, 20, {
				angle: i * 0.2,
				isStatic: true,
				render: { fillStyle: 'green' },
			});
			bodies.push(branch);
		}

		Composite.add(this._engine.world, bodies);
	}
}
customElements.define('game-tree', GameTree);
