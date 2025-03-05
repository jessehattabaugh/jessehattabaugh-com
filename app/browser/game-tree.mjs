import Matter from 'matter-js';
import { getWalls } from './bodies.mjs';
import { GameBase } from './game-base.mjs';
const { Composite, Bodies, Render, Events } = Matter;

export class GameTree extends GameBase {
	constructor() {
		super();
		// Basic initialization
		this._soilBody = null;
		this._skyBody = null;
		this._prompt = null;
		this._hasInteracted = false;
		this._boundHandleClick = this._handleClick.bind(this);
		this._debug = false; // Set to true to enable debugging
	}

	connectedCallback() {
		super.connectedCallback();
		this._createPrompt();
		this._setupEventListeners();

		// Make sure to run the debug renderer if in debug mode
		if (this._debug) {
			this._setupDebugRenderer();
		}

		// Setup your game elements here
		this.setupGameElements();
	}

	_setupPhysicsEngine() {
		// Create engine with downward gravity
		this._engine = this.createEngine({
			x: 0,
			y: 0.5, // Slightly reduced gravity for better visual effect
			scale: 0.001,
		});

		// Create render attached to our canvas
		this._render = this.createRender(
			this.shadowRoot,
			this._engine,
			window.innerWidth,
			window.innerHeight,
		);

		// Add collision event logging for debugging
		if (this._debug) {
			Events.on(this._engine, 'collisionStart', (event) => {
				console.log('Collision detected:', event.pairs.length);
			});
		}
	}

	createRender(element, engine, width, height) {
		// Configure the renderer with Matter.js options
		const render = Render.create({
			element, // Make sure element is provided (should be this.shadowRoot)
			engine, // Make sure engine is attached
			canvas: this._canvas, // Explicitly connect to the canvas
			options: {
				width,
				height,
				wireframes: this._debug, // Use wireframes in debug mode
				background: 'transparent',
				showSleeping: this._debug,
				showDebug: this._debug,
				showBounds: this._debug,
				showVelocity: this._debug,
				showAxes: this._debug,
				showPositions: this._debug,
				showAngleIndicator: this._debug,
				showIds: this._debug,
				showShadows: false,
				pixelRatio: 'auto',
			},
		});

		return render;
	}

	_setupDebugRenderer() {
		// Add debug info to DOM
		const debugInfo = document.createElement('div');
		debugInfo.style.position = 'absolute';
		debugInfo.style.top = '10px';
		debugInfo.style.left = '10px';
		debugInfo.style.background = 'rgba(0,0,0,0.7)';
		debugInfo.style.color = 'white';
		debugInfo.style.padding = '5px';
		debugInfo.style.zIndex = '1000';
		this.shadowRoot.appendChild(debugInfo);

		// Update debug info periodically
		setInterval(() => {
			const bodies = Composite.allBodies(this._engine.world);
			debugInfo.textContent = `Bodies: ${bodies.length}`;
		}, 1000);
	}

	_setupEventListeners() {
		super._setupEventListeners();
		this._canvas.addEventListener('click', this._boundHandleClick);

		// Add keyboard shortcut for debug mode
		window.addEventListener('keydown', (e) => {
			if (e.key === 'd') {
				this._debug = !this._debug;
				console.log('Debug mode:', this._debug);
				// Update render options
				this._render.options.wireframes = this._debug;
				this._render.options.showSleeping = this._debug;
				this._render.options.showDebug = this._debug;
				this._render.options.showBounds = this._debug;
				this._render.options.showVelocity = this._debug;
			}
		});
	}

	_createPrompt() {
		this._prompt = document.createElement('div');
		this._prompt.className = 'seed-prompt';
		this._prompt.textContent = 'Click anywhere to plant a seed';

		const style = document.createElement('style');
		style.textContent = `
			.seed-prompt {
				position: absolute;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%);
				background-color: rgba(255, 255, 255, 0.8);
				color: #4E342E;
				padding: 15px 30px;
				border-radius: 30px;
				font-family: system-ui, sans-serif;
				font-size: 18px;
				font-weight: bold;
				box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
				cursor: pointer;
				z-index: 10;
				transition: opacity 0.5s ease-out;
				opacity: 1;
				pointer-events: none;
			}

			.seed-prompt.fade-out {
				opacity: 0;
			}
		`;

		this.shadowRoot.appendChild(style);
		this.shadowRoot.appendChild(this._prompt);
	}

	_handleClick(event) {
		// Get canvas-relative coordinates
		const rect = this._canvas.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;

		// Log click for debugging
		console.log('Click detected at', x, y);

		// Plant a seed at the clicked location
		const seed = this.plantSeed(x, y);

		// Confirm seed was created and added to the world
		console.log(
			'Seed created:',
			seed.id,
			'Total bodies:',
			Composite.allBodies(this._engine.world).length,
		);

		// Hide prompt after first interaction
		if (!this._hasInteracted) {
			this._prompt.classList.add('fade-out');
			this._hasInteracted = true;
		}
	}



	// Reuse the wall creation method
	addWalls(width, height) {
		return getWalls(width, height);
	}

	setupGameElements() {
		const { width, height } = this._render.options;

		// Add example roots but don't add an initial seed
		// The user will plant seeds by clicking
		this.addRoots(width, height);

		// For testing, log the total number of bodies in the world
		console.log('Initial bodies:', Composite.allBodies(this._engine.world).length);
	}
	}

	disconnectedCallback() {
		super.disconnectedCallback();
		// Clean up event listeners
		if (this._canvas) {
			this._canvas.removeEventListener('click', this._boundHandleClick);
		}
	}
}
