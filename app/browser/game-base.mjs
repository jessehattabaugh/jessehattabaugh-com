import Matter from 'matter-js';
const { Composite, Render, Runner, Engine, Events } = Matter;

export class GameBase extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		// Initialize properties shared among games
		this._canvas = null;
		this._engine = null;
		this._render = null;
		this._runner = null;
		this._walls = [];
		this._boundResize = this._resizeCanvas.bind(this);
	}

	connectedCallback() {
		this._addStyles();
		this._setupCanvas();
		this._setupPhysicsEngine();
		this._resizeCanvas();
		window.addEventListener('resize', this._boundResize);
		this._setupEventListeners();
		this._setupCollisionDetection();
		Render.run(this._render);
		this._runner = Runner.create();
		Runner.run(this._runner, this._engine);
	}

	disconnectedCallback() {
		this._cleanup();
		window.removeEventListener('resize', this._boundResize);
	}

	_addStyles() {
		const style = document.createElement('style');
		style.textContent = `
			:host {
				display: block;
				position: fixed;
				width: 100%;
				height: 100%;
				overflow: hidden;
			}
			canvas {
				width: 100%;
				height: 100%;
				object-fit: contain;
				touch-action: none;
			}
		`;
		this.shadowRoot.appendChild(style);
	}

	_setupCanvas() {
		this._canvas = document.createElement('canvas');
		this.shadowRoot.appendChild(this._canvas);
	}

	_setupPhysicsEngine() {
		this._engine = this.createEngine();
		this._render = this.createRender(this.shadowRoot, this._engine,
			window.innerWidth, window.innerHeight);
	}

	/**
	 * Creates a Matter.js engine with configurable gravity
	 * @param {object} gravityOptions - Optional gravity configuration
	 * @param {number} gravityOptions.x - Horizontal gravity component (default: 0)
	 * @param {number} gravityOptions.y - Vertical gravity component (default: 0)
	 * @param {number} gravityOptions.scale - Gravity scale factor (default: 0.001)
	 * @returns {Matter.Engine} A configured physics engine
	 */
	createEngine(gravityOptions = {}) {
		const gravity = {
			x: gravityOptions.x !== undefined ? gravityOptions.x : 0,
			y: gravityOptions.y !== undefined ? gravityOptions.y : 0,
			scale: gravityOptions.scale !== undefined ? gravityOptions.scale : 0.001
		};

		return Engine.create({
			gravity,
			positionIterations: 10,
			velocityIterations: 10,
		});
	}

	createRender(element, engine, width, height) {
		return Render.create({
			canvas: this._canvas,
			engine,
			options: {
				wireframes: false,
				background: 'black',
				showSleeping: false,
				showDebug: false,
				showBounds: false,
				showVelocity: false,
				width,
				height
			},
		});
	}

	_resizeCanvas() {
		// Adjust canvas dimensions and update renderer
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;
		this._canvas.width = viewportWidth;
		this._canvas.height = viewportHeight;
		if (this._render) {
			this._render.options.width = viewportWidth;
			this._render.options.height = viewportHeight;
			this._render.canvas.width = viewportWidth;
			this._render.canvas.height = viewportHeight;
			this._render.bounds.max.x = viewportWidth;
			this._render.bounds.max.y = viewportHeight;
		}
		// Reset walls in the engine world
		if (this._walls.length > 0) {
			Composite.remove(this._engine.world, this._walls);
			this._walls = [];
		}
		// Hook: game subclasses can add their own walls here if needed
		if (this.addWalls) {
			this._walls = this.addWalls(viewportWidth, viewportHeight);
			Composite.add(this._engine.world, this._walls);
		}
	}

	_setupEventListeners() {
		// Subclasses may add additional event listeners
		// Prevent unwanted browser behaviors
		this.addEventListener('contextmenu', (e) => {return e.preventDefault()});
		this.addEventListener('dblclick', (e) => {return e.preventDefault()}, { passive: false });
		this.addEventListener('wheel', (e) => { if (e.ctrlKey) {e.preventDefault();} }, { passive: false });
	}

	_setupCollisionDetection() {
		// Default collision handling, subclasses may override
		Events.on(this._engine, 'collisionStart', (event) => {return this._handleCollisions(event.pairs)});
		Events.on(this._engine, 'collisionActive', (event) => {return this._handleCollisions(event.pairs)});
	}

	_handleCollisions() {
		// ...existing collision handling logic...
		// Note: subclasses can override or extend this method.
	}

	_cleanup() {
		if (this._runner) {
			Runner.stop(this._runner);
		}
		// ...existing cleanup code...
	}
}
