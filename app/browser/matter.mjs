import Matter from 'matter-js';

// module aliases
const Bodies = Matter.Bodies,
	Common = Matter.Common,
	Composite = Matter.Composite,
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

// Set up audio context
let audioContext;

// Initialize audio context on first user interaction to comply with browser policies
document.addEventListener('pointerdown', initAudio, { once: true });

function initAudio() {
	// Create audio context
	audioContext = new (window.AudioContext || window.webkitAudioContext)();
}

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

	// Spawn one polygon immediately
	spawnPolygon(pointerX, pointerY, 6);

	// Start continuous spawning
	if (!spawnInterval) {
		spawnInterval = setInterval(() => {
			if (isPointerDown) {
				spawnPolygon(pointerX, pointerY, 6);
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

// Prevent zooming and other unwanted behaviors
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
document.addEventListener(
	'wheel',
	(e) => {
		if (e.ctrlKey) e.preventDefault(); // Prevent ctrl+wheel zoom
	},
	{ passive: false },
);

// Clean up when page unloads
window.addEventListener('beforeunload', () => {
	if (spawnInterval) {
		clearInterval(spawnInterval);
	}
});

// Set up collision event listener
Events.on(engine, 'collisionStart', function (event) {
	if (!audioContext) return;

	// Check if we should play a sound (to avoid sound spam)
	let pairs = event.pairs;

	for (let i = 0; i < pairs.length; i++) {
		let pair = pairs[i];

		// Calculate collision force (simplified)
		let bodyA = pair.bodyA;
		let bodyB = pair.bodyB;

		// Skip if one of the bodies is a wall
		if (bodyA.isStatic || bodyB.isStatic) continue;

		// Calculate relative velocity magnitude
		let velA = bodyA.velocity;
		let velB = bodyB.velocity;
		let relVelocity = Math.sqrt(Math.pow(velA.x - velB.x, 2) + Math.pow(velA.y - velB.y, 2));

		// Only play sound if velocity is significant
		if (relVelocity > 3) {
			playCollisionSound(relVelocity);
		}
	}
});

/**
 * Plays a sound based on collision force
 * @param {number} intensity - Collision intensity (affects sound parameters)
 */
function playCollisionSound(intensity) {
	if (!audioContext) return;

	// Limit the max intensity to prevent extremely loud sounds
	intensity = Math.min(intensity, 20);

	// Create oscillator
	const oscillator = audioContext.createOscillator();
	const gainNode = audioContext.createGain();

	// Connect nodes: oscillator -> gain -> destination
	oscillator.connect(gainNode);
	gainNode.connect(audioContext.destination);

	// Set sound parameters based on collision intensity
	const baseFrequency = 200 + Math.random() * 300;
	oscillator.frequency.value = baseFrequency;
	oscillator.type = 'sine';

	// Set volume based on intensity but keep it reasonable
	const volume = Math.min(0.05 + intensity / 100, 0.2);
	gainNode.gain.value = volume;

	// Schedule the sound
	const now = audioContext.currentTime;
	oscillator.start(now);

	// Fade out
	const duration = 0.1 + intensity / 100;
	gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
	oscillator.stop(now + duration + 0.05);

	// Clean up
	setTimeout(() => {
		oscillator.disconnect();
		gainNode.disconnect();
	}, (duration + 0.1) * 1000);
}

// run the renderer
Render.run(render);

// create runner
const runner = Runner.create();

// run the engine
Runner.run(runner, engine);

/** spawn a polygon on the canvas
 * @param {number} x
 * @param {number} y
 * @param {number} sides
 */
function spawnPolygon(x, y, sides) {
	// Get all possible colors for this shape
	const colors = getColor(sides);

	// Create a polygon at the pointer position
	const polygon = Bodies.polygon(x, y, sides, 50, {
		restitution: 0.9, // Slightly reduce restitution
		friction: 0,
		frictionStatic: 0,
		frictionAir: 0.001, // Add tiny bit of air friction for stability
		render: {
			fillStyle: colors[Math.floor(Common.random() * colors.length)], // Pick a random color from the array
		},
	});

	// Add random velocity to the polygon (with capped values)
	const maxVelocity = 50; // Limit the maximum velocity
	const randomX = (Common.random() - 0.5) * maxVelocity;
	const randomY = (Common.random() - 0.5) * maxVelocity;
	Matter.Body.setVelocity(polygon, { x: randomX, y: randomY });

	// Add the polygon to the world
	Composite.add(engine.world, polygon);
}

/**
 * creates walls on each side of the canvas
 * @param {number} canvasSize
 */
function createWalls(canvasSize) {
	// Increase wall thickness significantly
	const wallThickness = 50;
	const halfWall = wallThickness / 2;
	const midCanvas = canvasSize / 2;
	const opts = {
		isStatic: true,
		restitution: 0.9, // Slightly reduce restitution to prevent excessive bouncing
		friction: 0,
		frictionStatic: 0,
	};
	const walls = [];

	// north wall
	walls.push(
		Bodies.rectangle(midCanvas, halfWall, canvasSize + wallThickness, wallThickness, opts),
	);
	// south wall
	walls.push(
		Bodies.rectangle(
			midCanvas,
			canvasSize - halfWall,
			canvasSize + wallThickness,
			wallThickness,
			opts,
		),
	);
	// east wall
	walls.push(
		Bodies.rectangle(halfWall, midCanvas, wallThickness, canvasSize + wallThickness, opts),
	);
	// west wall
	walls.push(
		Bodies.rectangle(
			canvasSize - halfWall,
			midCanvas,
			wallThickness,
			canvasSize + wallThickness,
			opts,
		),
	);

	return walls;
}

/**
 * Returns an array of colors with evenly distributed hues
 * @param {number} [totalColors=6] - Number of colors to generate evenly around the color wheel
 * @returns {string[]} An array of colors with evenly distributed hues
 */
function getColor(totalColors = 6) {
	const colors = [];
	// Calculate the hue step size to evenly distribute around 360 degrees
	const hueStep = 360 / totalColors;

	// Generate totalColors colors with evenly distributed hues
	for (let i = 0; i < totalColors; i++) {
		// Calculate the hue for this index
		const hue = Math.floor(i * hueStep);
		// Add the color to our array
		colors.push(`hsla(${hue}, 100%, 75%, 0.8)`);
	}

	return colors;
}
