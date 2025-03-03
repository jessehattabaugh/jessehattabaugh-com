/**
 * Bodies module for Matter.js shape creation
 */

import Matter from 'matter-js';

const Bodies = Matter.Bodies;
const Common = Matter.Common;

/**
 * Creates an array of bodies representing the walls of the canvas
 * @param {number} canvasSize
 * @returns {Matter.Body[]} Array of wall bodies
 */
export function getWalls(canvasSize) {
	const wallThickness = 50;
	const halfWall = wallThickness / 2;
	const midCanvas = canvasSize / 2;
	const opts = {
		isStatic: true,
		restitution: 1,
		friction: 0,
		frictionStatic: 0,
	};

	return [
		// north wall
		Bodies.rectangle(midCanvas, halfWall, canvasSize + wallThickness, wallThickness, opts),
		// south wall
		Bodies.rectangle(
			midCanvas,
			canvasSize - halfWall,
			canvasSize + wallThickness,
			wallThickness,
			opts,
		),
		// east wall
		Bodies.rectangle(halfWall, midCanvas, wallThickness, canvasSize + wallThickness, opts),
		// west wall
		Bodies.rectangle(
			canvasSize - halfWall,
			midCanvas,
			wallThickness,
			canvasSize + wallThickness,
			opts,
		),
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
