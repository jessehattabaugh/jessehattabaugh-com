/**
 * Interaction module for handling user input in the Matter.js application
 */

// Variables to track pointer state
let isPointerDown = false;
let pointerX = 0;
let pointerY = 0;
let spawnInterval = null;
const SPAWN_DELAY = 100; // Spawn a new triangle every 100ms

/**
 * Set up all pointer event listeners
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Function} onPointerDown - Callback when pointer is down
 * @param {Function} onPointerMove - Callback when pointer moves
 * @param {Function} onPointerUp - Callback when pointer is up
 */
function setupInteraction(canvas, onPointerDown, onPointerMove, onPointerUp) {
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

		// Call the pointer down callback
		onPointerDown(pointerX, pointerY);

		// Start continuous spawning
		if (!spawnInterval) {
			spawnInterval = setInterval(() => {
				if (isPointerDown) {
					onPointerDown(pointerX, pointerY);
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

			if (onPointerMove) {
				onPointerMove(pointerX, pointerY);
			}
		}
	});

	// Stop spawning when pointer is released
	document.addEventListener('pointerup', () => {
		isPointerDown = false;
		if (onPointerUp) {
			onPointerUp();
		}
	});

	// Stop spawning if pointer leaves canvas
	document.addEventListener('pointerleave', () => {
		isPointerDown = false;
		if (onPointerUp) {
			onPointerUp();
		}
	});

	// Handle pointer cancellation
	document.addEventListener('pointercancel', () => {
		isPointerDown = false;
		if (onPointerUp) {
			onPointerUp();
		}
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
}

/**
 * Clean up any intervals or listeners
 */
function cleanup() {
	if (spawnInterval) {
		clearInterval(spawnInterval);
		spawnInterval = null;
	}
}

export { setupInteraction, cleanup };
