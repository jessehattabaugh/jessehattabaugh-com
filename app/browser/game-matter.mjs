import Matter from 'matter-js';
import { initAudio, playCollisionSound, playShatteringSound } from './audio.mjs';
import { getWalls, getPolygon } from './bodies.mjs';

// Module aliases
const {Composite} = Matter,
	{Events} = Matter,
	{Render} = Matter,
	{Runner} = Matter,
	{Engine} = Matter,
	{Body} = Matter,
	{Common} = Matter;

export class GameMatter extends HTMLElement {
	// Class properties
	#canvas;
	#engine;
	#render;
	#runner;
	#isPointerDown = false;
	#pointerX = 0;
	#pointerY = 0;
	#spawnInterval = null;
	#SPAWN_DELAY = 100;
	#walls = [];
	#boundHandlePointerDown;
	#boundHandlePointerMove;
	#boundHandlePointerUp;

	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
	}

	connectedCallback() {
		// Add styles to shadow DOM
		this.#addStyles();

		// Create and set up canvas
		this.#setupCanvas();

		// Initialize physics engine
		this.#setupPhysicsEngine();

		// Add walls - this will now happen in resizeCanvas
		this.#resizeCanvas();

		// Add resize listener
		window.addEventListener('resize', this.#resizeCanvas.bind(this));

		// Set up event listeners
		this.#setupEventListeners();

		// Set up collision detection
		this.#setupCollisionDetection();

		// Start the engine
		Render.run(this.#render);
		this.#runner = Runner.create();
		Runner.run(this.#runner, this.#engine);
	}

	disconnectedCallback() {
		// Clean up resources
		this.#cleanup();
	}

	#addStyles() {
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

	#setupCanvas() {
		// Create canvas element
		this.#canvas = document.createElement('canvas');
		this.shadowRoot.appendChild(this.#canvas);
	}

	#setupPhysicsEngine() {
		// Create engine
		this.#engine = Engine.create({
			gravity: { x: 0, y: 0 },
			positionIterations: 10,
			velocityIterations: 10,
		});

		// Create renderer (dimensions will be set in resizeCanvas)
		this.#render = Render.create({
			canvas: this.#canvas,
			engine: this.#engine,
			options: {
				wireframes: false,
				background: 'black',
				showSleeping: false,
				showDebug: false,
				showBounds: false,
				showVelocity: false,
			},
		});
	}

	#resizeCanvas() {
		// Get viewport dimensions
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;

		// Set canvas size to match viewport
		this.#canvas.width = viewportWidth;
		this.#canvas.height = viewportHeight;

		// Update renderer dimensions
		if (this.#render) {
			this.#render.options.width = viewportWidth;
			this.#render.options.height = viewportHeight;
			this.#render.canvas.width = viewportWidth;
			this.#render.canvas.height = viewportHeight;
			this.#render.bounds.max.x = viewportWidth;
			this.#render.bounds.max.y = viewportHeight;
		}

		// Remove old walls if they exist
		if (this.#walls.length > 0) {
			Composite.remove(this.#engine.world, this.#walls);
			this.#walls = [];
		}

		// Add new walls based on current canvas size
		this.#walls = getWalls(viewportWidth, viewportHeight);
		Composite.add(this.#engine.world, this.#walls);
	}

	#setupEventListeners() {
			// Store bound functions
			this.#boundHandlePointerDown = this.#handlePointerDown.bind(this);
			this.#boundHandlePointerMove = this.#handlePointerMove.bind(this);
			this.#boundHandlePointerUp = this.#handlePointerUp.bind(this);

			// Add event listeners with stored bound functions
			this.addEventListener('pointerdown', this.#boundHandlePointerDown);
			this.addEventListener('pointermove', this.#boundHandlePointerMove);
			this.addEventListener('pointerup', this.#boundHandlePointerUp);
			this.addEventListener('pointerleave', this.#boundHandlePointerUp);
			this.addEventListener('pointercancel', this.#boundHandlePointerUp);

			// Audio initialization
			this.addEventListener('pointerdown', initAudio, { once: true });

			// Prevent unwanted browser behaviors
			this.addEventListener('dblclick', (e) => {return e.preventDefault()}, { passive: false });
			this.addEventListener(
				'wheel',
				(e) => {
					if (e.ctrlKey) {e.preventDefault();} // Prevent ctrl+wheel zoom
				},
				{ passive: false },
			);

			// Handle pointer capture
			this.#canvas.addEventListener('gotpointercapture', (e) => {
				this.#canvas.setPointerCapture(e.pointerId);
			});
		}

	#handlePointerDown(event) {
		event.preventDefault();
		this.#isPointerDown = true;

		// Calculate pointer position relative to canvas with scaling
		const rect = this.#canvas.getBoundingClientRect();
		this.#pointerX = (event.clientX - rect.left);
		this.#pointerY = (event.clientY - rect.top);

		// Spawn a polygon at pointer position
		this.#spawnPolygonAtPointer();

		// Start continuous spawning
		if (!this.#spawnInterval) {
			this.#spawnInterval = setInterval(() => {
				if (this.#isPointerDown) {
					this.#spawnPolygonAtPointer();
				}
			}, this.#SPAWN_DELAY);
		}
	}

	#handlePointerMove(event) {
		if (!this.#isPointerDown) {return;}

		const rect = this.#canvas.getBoundingClientRect();
		this.#pointerX = (event.clientX - rect.left);
		this.#pointerY = (event.clientY - rect.top);
	}

	#handlePointerUp() {
		this.#isPointerDown = false;
	}

	#spawnPolygonAtPointer() {
		const polygon = getPolygon(this.#pointerX, this.#pointerY, 6);
		this.#spawn(polygon);
	}

	#spawn(body) {
		// Add random velocity
		const maxVelocity = 50;
		const randomX = (Common.random() - 0.5) * maxVelocity;
		const randomY = (Common.random() - 0.5) * maxVelocity;
		Body.setVelocity(body, { x: randomX, y: randomY });

		// Add to world
		Composite.add(this.#engine.world, body);
	}

	#setupCollisionDetection() {
		Events.on(this.#engine, 'collisionStart', (event) => {

			// Check each collision pair
			const {pairs} = event;

			for (let i = 0; i < pairs.length; i++) {
				const pair = pairs[i];
				const {bodyA} = pair;
				const {bodyB} = pair;

				// Skip if one of the bodies is a wall
				if (bodyA.isStatic || bodyB.isStatic) {continue;}

				// Check if bodies have the same color
				if (bodyA.render.fillStyle === bodyB.render.fillStyle) {
					// Same color collision - remove both bodies and play shattering sound
					Composite.remove(this.#engine.world, [bodyA, bodyB]);
					playShatteringSound();
				} else {
					// Different color collision - play normal collision sound
					// Calculate relative velocity magnitude
					const velA = bodyA.velocity;
					const velB = bodyB.velocity;
					const relVelocity = Math.sqrt(
						Math.pow(velA.x - velB.x, 2) + Math.pow(velA.y - velB.y, 2),
					);

					// Only play sound if velocity is significant
					if (relVelocity > 3) {
						playCollisionSound(relVelocity);
					}
				}
			}
		});
	}

	#cleanup() {
		// Clear spawn interval
		if (this.#spawnInterval) {
			clearInterval(this.#spawnInterval);
			this.#spawnInterval = null;
		}

		// Stop the engine and runner
		if (this.#runner) {
			Runner.stop(this.#runner);
		}

		// Remove event listeners
		this.removeEventListener('pointerdown', this.#boundHandlePointerDown);
		this.removeEventListener('pointermove', this.#boundHandlePointerMove);
		this.removeEventListener('pointerup', this.#boundHandlePointerUp);
		this.removeEventListener('pointerleave', this.#boundHandlePointerUp);
		this.removeEventListener('pointercancel', this.#boundHandlePointerUp);

		// Remove resize listener
		window.removeEventListener('resize', this.#resizeCanvas.bind(this));
	}
}
