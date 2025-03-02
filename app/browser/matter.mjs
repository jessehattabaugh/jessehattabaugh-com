import Matter from 'matter-js';

// module aliases
const Engine = Matter.Engine,
	Render = Matter.Render,
	Runner = Matter.Runner,
	Bodies = Matter.Bodies,
	Composite = Matter.Composite,
	Constraint = Matter.Constraint;

// create a canvas
const canvasSize = 3840;
const canvas = document.createElement('canvas');
canvas.width = canvasSize;
canvas.height = canvasSize;
document.body.appendChild(canvas);

// create an engine
const engine = Engine.create({ gravity: { x: 0, y: 0 } });

// create a renderer
const render = Render.create({
	canvas,
	engine,
	options: { width: canvasSize, height: canvasSize },
});
// add walls to the world
Composite.add(engine.world, createWalls(canvasSize));

/** @todo add more things here */

// run the renderer
Render.run(render);

// create runner
const runner = Runner.create();

// run the engine
Runner.run(runner, engine);

/**
 * creates walls on each side of the canvas
 * @param {number} canvasSize
 */
function createWalls(canvasSize) {
	const opts = { isStatic: true };
	const size = 10;
	const halfWall = size / 2;
	const midCanvas = canvasSize / 2;
	const walls = [];

	// north wall
	walls.push(Bodies.rectangle(midCanvas, -halfWall, canvasSize, size, opts));
	// south wall
	walls.push(Bodies.rectangle(midCanvas, canvasSize + halfWall, canvasSize, size, opts));
	// east wall
	walls.push(Bodies.rectangle(-halfWall, midCanvas, size, canvasSize, opts));
	// west wall
	walls.push(Bodies.rectangle(canvasSize + halfWall, midCanvas, size, canvasSize, opts));

	return walls;
}
