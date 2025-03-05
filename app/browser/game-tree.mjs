import Matter from 'matter-js';
import { getWalls } from './bodies.mjs';
import { GameBase } from './game-base.mjs';
const { Composite, Bodies, Render } = Matter;

export class GameTree extends GameBase {
	constructor() {
		super();
		// Basic initialization
	}

	connectedCallback() {
		super.connectedCallback();
		// Setup your game elements here
		this.setupGameElements();
	}

	// Override _setupPhysicsEngine to use standard downward gravity
	_setupPhysicsEngine() {
		// Create engine with downward gravity
		this._engine = this.createEngine({
			x: 0,
			y: 1,
			scale: 0.001
		});

		// Create render
		this._render = this.createRender(this.shadowRoot, this._engine,
			window.innerWidth, window.innerHeight);
	}

	// Reuse the wall creation method
	addWalls(width, height) {
		return getWalls(width, height);
	}

	setupGameElements() {
		const { width, height } = this._render.options;
		// Example: Add a single element to the center
		const centerElement = Bodies.circle(width / 2, height / 2, 30, {
			render: { fillStyle: 'brown' }
		});

		Composite.add(this._engine.world, centerElement);

		// You can add more game elements and logic here
	}

	createRender(element, engine, width, height) {
		// Create the base render object
		const render = Render.create({
			element,
			engine,
			options: {
				width,
				height,
				wireframes: false,
				background: 'transparent', // Set to transparent to allow our gradient to show
				// Add any other render options you need here
			},
		});

		// Get the canvas from the render
		const {canvas} = render;
		const context = canvas.getContext('2d');

		// Override the before render callback to draw the gradient
		render.beforeRender = () => {
			// Create gradient
			const gradient = context.createLinearGradient(0, 0, 0, height);
			gradient.addColorStop(0, '#87CEEB'); // Sky blue at top
			gradient.addColorStop(0.7, '#E0F7FA'); // Light blue in middle
			gradient.addColorStop(1, '#8BC34A');   // Light green at bottom

			// Fill background with gradient
			context.fillStyle = gradient;
			context.fillRect(0, 0, width, height);
		};

		return render;
	}
}

customElements.define('game-tree', GameTree);
