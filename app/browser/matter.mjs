import Matter from 'matter-js';

// module aliases
const Bodies = Matter.Bodies,
	Common = Matter.Common,
	Composite = Matter.Composite,
	Render = Matter.Render,
	Runner = Matter.Runner,
	Engine = Matter.Engine;

// create a canvas
const canvasSize = 3840;
const canvas = document.createElement('canvas');
canvas.width = canvasSize;
canvas.height = canvasSize;
document.body.appendChild(canvas);

// Prevent zooming and other unwanted behaviors
canvas.style.touchAction = 'none'; // Disable browser handling of all touch gestures
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
document.addEventListener(
	'wheel',
	(e) => {
		if (e.ctrlKey) e.preventDefault(); // Prevent ctrl+wheel zoom
	},
	{ passive: false },
);

// create an engine
const engine = Engine.create({ gravity: { x: 0, y: 0 } });

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

// place a triangle in the center of the canvas
const centerX = canvasSize / 2;
const centerY = canvasSize / 2;
const triangle = getTriangle(centerX, centerY);
Composite.add(engine.world, triangle);

// Variables to track pointer state
let isPointerDown = false;
let pointerX = 0;
let pointerY = 0;
let spawnInterval = null;
const SPAWN_DELAY = 100; // Spawn a new triangle every 100ms

// Use pointer events instead of separate mouse and touch events
document.addEventListener('pointerdown', (event) => {
	event.preventDefault(); // Prevent default behaviors like zooming
	isPointerDown = true;

	// Update pointer coordinates
	const rect = canvas.getBoundingClientRect();
	const scaleX = canvas.width / rect.width;
	const scaleY = canvas.height / rect.height;
	pointerX = (event.clientX - rect.left) * scaleX;
	pointerY = (event.clientY - rect.top) * scaleY;

	// Spawn one triangle immediately
	spawnTriangle(pointerX, pointerY);

	// Start continuous spawning
	if (!spawnInterval) {
		spawnInterval = setInterval(() => {
			if (isPointerDown) {
				spawnTriangle(pointerX, pointerY);
			}
		}, SPAWN_DELAY);
	}
});

// Track pointer movement
document.addEventListener('pointermove', (event) => {
	if (isPointerDown) {
		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;
		pointerX = (event.clientX - rect.left) * scaleX;
		pointerY = (event.clientY - rect.top) * scaleY;
	}
});

// Stop spawning when pointer is released
document.addEventListener('pointerup', () => {
	isPointerDown = false;
});

// Stop spawning if pointer leaves canvas
document.addEventListener('pointerleave', () => {
	isPointerDown = false;
});

// Handle pointer cancellation
document.addEventListener('pointercancel', () => {
	isPointerDown = false;
});

// Improve pointer handling on canvas
canvas.style.touchAction = 'none'; // Disable default touch behaviors
canvas.addEventListener('gotpointercapture', (e) => {
	// Ensure the canvas keeps getting events even if the pointer moves away
	canvas.setPointerCapture(e.pointerId);
});

// Function to spawn a triangle
function spawnTriangle(x, y) {
	const triangle = getTriangle(x, y);
	const randomX = (Common.random() - 0.5) * 100;
	const randomY = (Common.random() - 0.5) * 100;
	Matter.Body.setVelocity(triangle, { x: randomX, y: randomY });
	Composite.add(engine.world, triangle);
}

// Clean up when page unloads
window.addEventListener('beforeunload', () => {
	if (spawnInterval) {
		clearInterval(spawnInterval);
	}
});

// run the renderer
Render.run(render);

// create runner
const runner = Runner.create();

// run the engine
Runner.run(runner, engine);

/** get a triangle */
function getTriangle(x, y) {
	return Bodies.polygon(x, y, 3, 50, {
		restitution: 1,
		friction: 0,
		frictionStatic: 0,
		frictionAir: 0,
		render: {
			fillStyle: getColor(),
			strokeStyle: getColor(), // Add border color if desired
			lineWidth: 1, // Border width
		},
	});
}

/**
 * creates walls on each side of the canvas
 * @param {number} canvasSize
 */
function createWalls(canvasSize) {
	const opts = { isStatic: true, restitution: 1, friction: 0, frictionStatic: 0 };
	const size = 10;
	const halfWall = size / 2;
	const midCanvas = canvasSize / 2;
	const walls = [];

	// north wall
	walls.push(Bodies.rectangle(midCanvas, halfWall, canvasSize, size, opts));
	// south wall
	walls.push(Bodies.rectangle(midCanvas, canvasSize - halfWall, canvasSize, size, opts));
	// east wall
	walls.push(Bodies.rectangle(halfWall, midCanvas, size, canvasSize, opts));
	// west wall
	walls.push(Bodies.rectangle(canvasSize - halfWall, midCanvas, size, canvasSize, opts));

	return walls;
}

/**
 * Returns a random rainbow color
 * @returns {string} A random color from the rainbow
 */
function getColor() {
	const colors = ['red', 'orange', 'yellow', 'green', 'blue', 'fuchia', 'purple'];
	return colors[Math.floor(Common.random() * colors.length)];
}
