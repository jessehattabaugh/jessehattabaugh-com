import Matter from 'matter-js';

const { Bodies, Body, Composite, Constraint, Vector } = Matter;

export class ZeroKart extends HTMLElement {
	constructor() {
		super();
		// Physics properties
		this._body = null;
		this._wheels = [];
		this._suspensions = [];

		// Kart properties - defaults that can be overridden with attributes
		this._acceleration = 0.005;
		this._maxSpeed = 5;
		this._handling = 0.9;
		this._grip = 0.8;
		this._weight = 10;
		this._color = 'red';

		// Driver properties
		this._driverId = 'default';
		this._driverImg = null;

		// Runtime state
		this._accelerating = false;
		this._braking = false;
		this._steering = 0; // -1 to 1
		this._handbrake = false;
		this._speed = 0;
		this._currentGrip = this._grip;
		this._boostTime = 0;
		this._slipTime = 0;
		this._airTime = 0;
	}

	// Add methods to support kart customization and cleanup

	setDriver(driverId, driverImg) {
		this._driverId = driverId;
		this._driverImg = driverImg;
		// Update visual representation if needed
		this._updateVisuals();
	}

	_updateVisuals() {
		// This would update the kart's visual appearance based on type, color, and driver
		// For a full implementation, this would involve sprite swapping or 3D model changes
		if (this._body) {
			this._body.render.fillStyle = this._color;
			// Additional visual updates could be made here
		}
	}

	cleanup(world) {
		// Remove physics bodies from the world to prevent memory leaks
		if (this._body) {
			Composite.remove(world, this._body);
		}

		this._wheels.forEach((wheel) => {
			Composite.remove(world, wheel);
		});

		this._suspensions.forEach((suspension) => {
			Composite.remove(world, suspension);
		});

		// Clear references
		this._body = null;
		this._wheels = [];
		this._suspensions = [];
	}

	attributeChangedCallback(name, oldValue, newValue) {
		switch (name) {
			case 'acceleration':
				this._acceleration = parseFloat(newValue) || 0.005;
				break;
			case 'max-speed':
				this._maxSpeed = parseFloat(newValue) || 5;
				break;
			case 'handling':
				this._handling = parseFloat(newValue) || 0.9;
				break;
			case 'grip':
				this._grip = parseFloat(newValue) || 0.8;
				break;
			case 'color':
				this._color = newValue || 'red';
				this._updateVisuals();
				break;
			case 'driver':
				this._driverId = newValue || 'default';
				this._updateVisuals();
				break;
			case 'driver-img':
				this._driverImg = newValue;
				this._updateVisuals();
				break;
		}
	}

	static get observedAttributes() {
		return ['acceleration', 'max-speed', 'handling', 'grip', 'color', 'driver', 'driver-img'];
	}
}

customElements.define('zk-kart', ZeroKart);
