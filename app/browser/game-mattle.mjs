import Matter from 'matter-js';
import { initAudio, playCollisionSound, playShatteringSound } from './audio.mjs';
import { getWalls, getPolygon } from './bodies.mjs';
import { GameBase } from './game-base.mjs';
const { Composite, Render, Runner, Body, Common, Vector } = Matter;

export class GameMattle extends GameBase {
	constructor() {
		super();
		// Bind pointer handlers
		this._boundHandlePointerDown = this._handlePointerDown.bind(this);
		this._boundHandlePointerMove = this._handlePointerMove.bind(this);
		this._boundHandlePointerUp = this._handlePointerUp.bind(this);
	}

	_setupEventListeners() {
		super._setupEventListeners();
		this.addEventListener('pointerdown', this._boundHandlePointerDown);
		this.addEventListener('pointermove', this._boundHandlePointerMove);
		this.addEventListener('pointerup', this._boundHandlePointerUp);
		this.addEventListener('pointerleave', this._boundHandlePointerUp);
		this.addEventListener('pointercancel', this._boundHandlePointerUp);
		this.addEventListener('pointerdown', initAudio, { once: true });
		this._canvas.addEventListener('gotpointercapture', (e) => {
			this._canvas.setPointerCapture(e.pointerId);
		});
		// ...existing event listener code...
	}

	_handlePointerDown(event) {
		event.preventDefault();
		this._isPointerDown = true;
		const rect = this._canvas.getBoundingClientRect();
		this._pointerX = (event.clientX - rect.left);
		this._pointerY = (event.clientY - rect.top);
		this._spawnPolygonAtPointer();
		if (!this._spawnInterval) {
			this._spawnInterval = setInterval(() => {
				if (this._isPointerDown) {
					this._spawnPolygonAtPointer();
				}
			}, 100);
		}
	}

	_handlePointerMove(event) {
		if (!this._isPointerDown) {return;}
		const rect = this._canvas.getBoundingClientRect();
		this._pointerX = (event.clientX - rect.left);
		this._pointerY = (event.clientY - rect.top);
	}

	_handlePointerUp() {
		this._isPointerDown = false;
	}

	_spawnPolygonAtPointer() {
		const polygon = getPolygon(this._pointerX, this._pointerY, 6);
		this._spawn(polygon);
	}

	_spawn(body) {
		const maxVelocity = 50;
		const randomX = (Common.random() - 0.5) * maxVelocity;
		const randomY = (Common.random() - 0.5) * maxVelocity;
		Body.setVelocity(body, { x: randomX, y: randomY });
		Composite.add(this._engine.world, body);
	}

	/**
	 * Public method to spawn multiple polygons across the canvas
	 */
	spawnPolygons(count = 100) {
		this._spawnPolygonsAcrossCanvas(count);
	}

	_spawnPolygonsAcrossCanvas(count) {
		// ...existing grid spawn logic...
		// (Same as before: create polygons across the canvas and add to world)
	}
}
