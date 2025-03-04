import Matter from 'matter-js';

const { Bodies, Composite, Vertices, Vector } = Matter;

export class ZeroTrack extends HTMLElement {
	constructor() {
		super();
		this._trackBodies = [];
		this._obstacles = [];
		this._checkpoints = [];
		this._startPositions = [];
	}

	// ...existing code...
}

customElements.define('zk-track', ZeroTrack);
