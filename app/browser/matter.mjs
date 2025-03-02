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

// place a polygon in the center of the canvas
const center = canvasSize / 2;
spawnPolygon(center, center, 3);

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
	spawnPolygon(pointerX, pointerY, 5);

	// Start continuous spawning
	if (!spawnInterval) {
		spawnInterval = setInterval(() => {
			if (isPointerDown) {
				spawnPolygon(pointerX, pointerY, 5);
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
Events.on(engine, 'collisionStart', function(event) {
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
        let relVelocity = Math.sqrt(
            Math.pow(velA.x - velB.x, 2) +
            Math.pow(velA.y - velB.y, 2)
        );

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
    const volume = Math.min(0.05 + (intensity / 100), 0.2);
    gainNode.gain.value = volume;

    // Schedule the sound
    const now = audioContext.currentTime;
    oscillator.start(now);

    // Fade out
    const duration = 0.1 + (intensity / 100);
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
	// Create a polygon at the pointer position
	const polygon = Bodies.polygon(x, y, sides, 50, {
		restitution: 1,
		friction: 0,
		frictionStatic: 0,
		frictionAir: 0,
		render: {
			fillStyle: getColor(),
			//strokeStyle: getColor(), // Add border color if desired
			//lineWidth: 5, // Border width
		},
	});

	// Add random velocity to the polygon
	const randomX = (Common.random() - 0.5) * 100;
	const randomY = (Common.random() - 0.5) * 100;
	Matter.Body.setVelocity(polygon, { x: randomX, y: randomY });

	// Add the polygon to the world
	Composite.add(engine.world, polygon);
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
	const colors = [
		'#CD6A9F', // pink
		'#65BDCC', // teal
		'#ADCE6C', // lime
		'#8067CC', // purple
		'#CD9669' // ornage
	];
	return colors[Math.floor(Common.random() * colors.length)];
}
