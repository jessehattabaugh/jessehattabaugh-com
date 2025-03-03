/**
 * Physics module for Matter.js shape creation and manipulation
 */

import Matter from 'matter-js';

const Bodies = Matter.Bodies;
const Body = Matter.Body;
const Common = Matter.Common;
const Composite = Matter.Composite;

/**
 * Creates walls on each side of the canvas
 * @param {number} canvasSize
 * @param {Matter.Engine} engine
 * @returns {Matter.Body[]} Array of wall bodies
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

/**
 * Spawn a polygon on the canvas
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} sides - Number of sides
 * @param {Matter.Engine} engine - Matter.js engine
 */
function spawnPolygon(x, y, sides, engine) {
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
	Body.setVelocity(polygon, { x: randomX, y: randomY });

	// Add the polygon to the world
	Composite.add(engine.world, polygon);
}

export { createWalls, spawnPolygon, getColor };
