import Matter from 'matter-js';
import {
	initAudio,
	playCollisionSound,
	playShatteringSound,
	hasAudioContext,
} from './modules/audio.mjs';
import { createWalls, spawnPolygon } from './modules/physics.mjs';
import { setupInteraction } from './modules/interaction.mjs';

// module aliases
const Composite = Matter.Composite,
	Events = Matter.Events,
	Render = Matter.Render,
	Runner = Matter.Runner,
	Engine = Matter.Engine;

// create a canvas
const canvasSize = 3840;
const canvas = document.createElement('canvas');
canvas.width = canvasSize;
canvas.height = canvasSize;
document.body.appendChild(canvas);

// Initialize audio context on first user interaction to comply with browser policies
document.addEventListener('pointerdown', initAudio, { once: true });

// create an engine
const engine = Engine.create({
	gravity: { x: 0, y: 0 },
	// Add better collision detection to prevent tunneling
	positionIterations: 10, // (default is 6) increase for better accuracy
	velocityIterations: 10, // (default is 4) increase for better accuracy
});

// create a renderer
const render = Render.create({
	canvas,
	engine,
	options: {
		width: canvasSize,
		height: canvasSize,
		wireframes: false, // Set wireframes to false to enable fill
		background: 'black', // Set a background color (optional)
		showSleeping: false, // Hide sleeping indicators
		showDebug: false, // Hide debug information
		showBounds: false, // Hide bounding boxes
		showVelocity: false, // Hide velocity indicators
	},
});

// add walls to the world
Composite.add(engine.world, createWalls(canvasSize));

// Set up pointer interaction
setupInteraction(
	canvas,
	// onPointerDown callback
	(x, y) => spawnPolygon(x, y, 6, engine),
	// onPointerMove callback
	null,
	// onPointerUp callback
	null,
);

// Set up collision event listener
Events.on(engine, 'collisionStart', function (event) {
	if (!hasAudioContext()) return;

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
			Composite.remove(engine.world, [bodyA, bodyB]);
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

// run the renderer
Render.run(render);

// create runner
const runner = Runner.create();

// run the engine
Runner.run(runner, engine);
