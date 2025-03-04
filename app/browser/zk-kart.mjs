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

    // ...existing code...
}

customElements.define('zk-kart', ZeroKart);
