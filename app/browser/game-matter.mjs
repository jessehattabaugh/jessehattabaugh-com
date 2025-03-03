import Matter from 'matter-js';
import { initAudio, playCollisionSound, playShatteringSound } from './audio.mjs';
import { getWalls, getPolygon } from './bodies.mjs';

// Module aliases
const Composite = Matter.Composite,
	Events = Matter.Events,
	Render = Matter.Render,
	Runner = Matter.Runner,
	Engine = Matter.Engine,
	Body = Matter.Body,
	Common = Matter.Common;

export class GameMatter extends HTMLElement {
	// Class properties
	#canvas;
	#engine;
	#render;
	#runner;
	#canvasSize = 3840;
	#isPointerDown = false;
	#pointerX = 0;
	#pointerY = 0;
	#spawnInterval = null;
	#SPAWN_DELAY = 100;

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

		// Add walls
		Composite.add(this.#engine.world, getWalls(this.#canvasSize));

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
				aspect-ratio: 1;
				min-height: 100vh;
				object-fit: cover;
				max-height: 100vh;
				outline: 1px dashed red;
				touch-action: none;
			}
		`;
		this.shadowRoot.appendChild(style);
	}

	#setupCanvas() {
		// Create canvas element
		this.#canvas = document.createElement('canvas');
		this.#canvas.width = this.#canvasSize;
		this.#canvas.height = this.#canvasSize;
		this.#canvas.style.touchAction = 'none'; // Disable default touch behaviors

		// Add to shadow DOM
		this.shadowRoot.appendChild(this.#canvas);
	}

	#setupPhysicsEngine() {
		// Create engine
		this.#engine = Engine.create({
			gravity: { x: 0, y: 0 },
			positionIterations: 10,
			velocityIterations: 10,
		});

		// Create renderer
		this.#render = Render.create({
			canvas: this.#canvas,
			engine: this.#engine,
			options: {
				width: this.#canvasSize,
				height: this.#canvasSize,
				wireframes: false,
				background: 'black',
				showSleeping: false,
				showDebug: false,
				showBounds: false,
				showVelocity: false,
			},
		});
	}

	#setupEventListeners() {
		// Audio initialization
		this.addEventListener('pointerdown', initAudio, { once: true });

		// Pointer events
		this.addEventListener('pointerdown', this.#handlePointerDown.bind(this));
		this.addEventListener('pointermove', this.#handlePointerMove.bind(this));
		this.addEventListener('pointerup', this.#handlePointerUp.bind(this));
		this.addEventListener('pointerleave', this.#handlePointerUp.bind(this));
		this.addEventListener('pointercancel', this.#handlePointerUp.bind(this));

		// Prevent unwanted browser behaviors
		this.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
		this.addEventListener(
			'wheel',
			(e) => {
				if (e.ctrlKey) e.preventDefault(); // Prevent ctrl+wheel zoom
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
		const scaleX = this.#canvas.width / rect.width;
		const scaleY = this.#canvas.height / rect.height;
		this.#pointerX = (event.clientX - rect.left) * scaleX;
		this.#pointerY = (event.clientY - rect.top) * scaleY;

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
		if (!this.#isPointerDown) return;

		const rect = this.#canvas.getBoundingClientRect();
		const scaleX = this.#canvas.width / rect.width;
		const scaleY = this.#canvas.height / rect.height;
		this.#pointerX = (event.clientX - rect.left) * scaleX;
		this.#pointerY = (event.clientY - rect.top) * scaleY;
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
			let pairs = event.pairs;

			for (let i = 0; i < pairs.length; i++) {
				let pair = pairs[i];
				let bodyA = pair.bodyA;
				let bodyB = pair.bodyB;

				// Skip if one of the bodies is a wall
				if (bodyA.isStatic || bodyB.isStatic) continue;

				// Check if bodies have the same color
				if (bodyA.render.fillStyle === bodyB.render.fillStyle) {
					// Same color collision - remove both bodies and play shattering sound
					Composite.remove(this.#engine.world, [bodyA, bodyB]);
					playShatteringSound();
				} else {
					// Different color collision - play normal collision sound
					// Calculate relative velocity magnitude
					let velA = bodyA.velocity;
					let velB = bodyB.velocity;
					let relVelocity = Math.sqrt(
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
		this.removeEventListener('pointerdown', this.#handlePointerDown);
		this.removeEventListener('pointermove', this.#handlePointerMove);
		this.removeEventListener('pointerup', this.#handlePointerUp);
		this.removeEventListener('pointerleave', this.#handlePointerUp);
		this.removeEventListener('pointercancel', this.#handlePointerUp);
	}
}
