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
		const { width, height } = this._render.options;
		const groundLevel = height / 2;
		const seedRadius = 10;
		// Create seed: circle with bottom flush to ground
		const seed = Matter.Bodies.circle(width / 2, groundLevel + seedRadius, seedRadius, {
			isStatic: true,
			render: { fillStyle: 'sienna' },
		});
		Composite.add(this._engine.world, seed);
		this.treeSegments = [seed];
		this._growthCycleIndex = 0;

		// Start growth cycle: trunk segments elongate upward; add roots and branches at milestones.
		this._growthInterval = setInterval(() => {
			this._growthCycleIndex++;
			// Grow a new trunk segment above the last segment
			const lastSegment = this.treeSegments[this.treeSegments.length - 1];
			const segmentHeight = 20;
			const newY = lastSegment.position.y - segmentHeight;
			const newSegment = Matter.Bodies.rectangle(lastSegment.position.x, newY, 20, segmentHeight, {
				isStatic: true,
				render: { fillStyle: 'brown' },
			});
			Composite.add(this._engine.world, newSegment);
			this.treeSegments.push(newSegment);

			if(this._growthCycleIndex === 2) {
				// Add roots extending downward from the seed base
				const rootLength = 40;
				const leftRoot = Matter.Bodies.rectangle(seed.position.x - 10, seed.position.y + seedRadius + rootLength/2, 10, rootLength, {
					isStatic: true,
					angle: 0.2,
					render: { fillStyle: 'darkgreen' },
				});
				const rightRoot = Matter.Bodies.rectangle(seed.position.x + 10, seed.position.y + seedRadius + rootLength/2, 10, rootLength, {
					isStatic: true,
					angle: -0.2,
					render: { fillStyle: 'darkgreen' },
				});
				Composite.add(this._engine.world, leftRoot);
				Composite.add(this._engine.world, rightRoot);
			}

			if(this._growthCycleIndex === 3) {
				// Add branches extending upward from current trunk segment
				const branchLength = 40;
				const branchY = newSegment.position.y - segmentHeight / 2;
				const leftBranch = Matter.Bodies.rectangle(newSegment.position.x - 10, branchY, branchLength, 10, {
					isStatic: true,
					angle: -Math.PI / 4,
					render: { fillStyle: 'green' },
				});
				const rightBranch = Matter.Bodies.rectangle(newSegment.position.x + 10, branchY, branchLength, 10, {
					isStatic: true,
					angle: Math.PI / 4,
					render: { fillStyle: 'green' },
				});
				Composite.add(this._engine.world, leftBranch);
				Composite.add(this._engine.world, rightBranch);
			}

			// Stop growth after 10 cycles
			if(this._growthCycleIndex >= 100) {
				clearInterval(this._growthInterval);
			}
		}, 1000);
	}
}
customElements.define('game-tree', GameTree);
