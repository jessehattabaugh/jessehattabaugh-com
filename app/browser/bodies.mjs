/**
 * Bodies module for Matter.js shape creation
 */

import Matter from 'matter-js';

const { Bodies } = Matter;
const { Common } = Matter;

/**
 * Creates an array of bodies representing the walls of the canvas
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @returns {Matter.Body[]} Array of wall bodies
 */
export function getWalls(width, height) {
	// Wall configuration
	const wallThickness = 50;
	const wallOffset = -wallThickness / 2; // Position walls halfway outside the visible area
	const opts = { isStatic: true, restitution: 1, friction: 0, frictionStatic: 0 };

	return [
		// Top wall - positioned just above the viewport
		Bodies.rectangle(width / 2, wallOffset, width + wallThickness, wallThickness, opts),

		// Bottom wall - positioned just below the viewport
		Bodies.rectangle(width / 2, height - wallOffset, width + wallThickness, wallThickness, opts),

		// Left wall - positioned just left of the viewport
		Bodies.rectangle(wallOffset, height / 2, wallThickness, height + wallThickness, opts),

		// Right wall - positioned just right of the viewport
		Bodies.rectangle(width - wallOffset, height / 2, wallThickness, height + wallThickness, opts),
	];
}

/**
 * Returns an array of colors with evenly distributed hues
 * @param {number} [totalColors=6] - Number of colors to generate evenly around the color wheel
 * @returns {string[]} An array of colors with evenly distributed hues
 */
export function getColor(totalColors = 6) {
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

/**
 * Creates a polygon body
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} sides - Number of sides
 * @returns {Matter.Body} The created polygon body
 */
export function getPolygon(x, y, sides) {
	// Get all possible colors for this shape
	const colors = getColor(sides);

	// Pick a random color from the array
	const fillStyle = colors[Math.floor(Common.random() * colors.length)];

	// Create a polygon at the pointer position
	return Bodies.polygon(x, y, sides, 50, {
		restitution: 1,
		friction: 0,
		frictionStatic: 0,
		frictionAir: 0,
		render: { fillStyle },
	});
}
