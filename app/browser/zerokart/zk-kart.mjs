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

    connectedCallback() {
        // Read attributes
        this._readAttributes();
    }

    _readAttributes() {
        if (this.hasAttribute('acceleration'))
            {this._acceleration = parseFloat(this.getAttribute('acceleration'));}

        if (this.hasAttribute('max-speed'))
            {this._maxSpeed = parseFloat(this.getAttribute('max-speed'));}

        if (this.hasAttribute('handling'))
            {this._handling = parseFloat(this.getAttribute('handling'));}

        if (this.hasAttribute('grip'))
            {this._grip = parseFloat(this.getAttribute('grip'));}

        if (this.hasAttribute('weight'))
            {this._weight = parseFloat(this.getAttribute('weight'));}

        this._color = this.getAttribute('color') || 'red';
        this._type = this.getAttribute('type') || 'standard';
    }

    initializePhysics(world) {
        const kartWidth = 30;
        const kartHeight = 50;

        // Create main body of the kart
        this._body = Bodies.rectangle(0, 0, kartWidth, kartHeight, {
            chamfer: { radius: 5 },
            density: this._weight / 100,
            frictionAir: 0.05,
            restitution: 0.3,
            render: {
                fillStyle: this._color,
                strokeStyle: '#000000',
                lineWidth: 1
            }
        });

        // Add kart ID to body for collision detection
        this._body.parent.kartId = this.id;

        // Create wheels
        const wheelRadius = 8;
        const wheelPositions = [
            { x: -kartWidth/2 + 5, y: -kartHeight/2 + 10 }, // Front left
            { x: kartWidth/2 - 5, y: -kartHeight/2 + 10 },  // Front right
            { x: -kartWidth/2 + 5, y: kartHeight/2 - 10 },  // Rear left
            { x: kartWidth/2 - 5, y: kartHeight/2 - 10 }    // Rear right
        ];

        wheelPositions.forEach((pos, index) => {
            const wheel = Bodies.circle(pos.x, pos.y, wheelRadius, {
                density: 0.1,
                frictionAir: 0.01,
                friction: this._grip,
                restitution: 0.2,
                render: {
                    fillStyle: '#222222',
                    strokeStyle: '#000000',
                    lineWidth: 1
                }
            });

            // Create suspension as a spring constraint
            const suspension = Constraint.create({
                bodyA: this._body,
                bodyB: wheel,
                pointA: pos,
                stiffness: 0.2,
                damping: 0.5,
                render: {
                    visible: true,
                    lineWidth: 1,
                    strokeStyle: '#DDDDDD'
                }
            });

            this._wheels.push({ body: wheel, isFront: index < 2 });
            this._suspensions.push(suspension);
        });

        // Create composite for kart
        const kartComposite = Composite.create({ label: `kart-${this.id}` });
        Composite.add(kartComposite, [this._body, ...this._wheels.map(w => {return w.body}), ...this._suspensions]);

        // Add to world
        Composite.add(world, kartComposite);
    }

    update(deltaTime) {
        if (!this._body) {return;}

        // Update timers
        if (this._boostTime > 0) {this._boostTime -= deltaTime;}
        if (this._slipTime > 0) {
            this._slipTime -= deltaTime;
            this._currentGrip = this._grip * 0.3;
        } else {
            this._currentGrip = this._grip;
        }

        // Check if in air
        const isGrounded = this._wheels.some(wheel =>
            {return wheel.body.collision.collided});

        if (!isGrounded) {
            this._airTime += deltaTime;
        } else if (this._airTime > 0) {
            this._airTime = 0;
        }

        // Apply friction to wheels
        this._wheels.forEach(wheel => {
            Body.setFriction(wheel.body, this._currentGrip);
        });

        // Handle acceleration
        const forwardVector = this._getForwardVector();

        if (this._accelerating && isGrounded) {
            // Apply acceleration force to front wheels for front wheel drive
            const accelerationForce = Vector.mult(
                forwardVector,
                this._acceleration * (this._boostTime > 0 ? 2 : 1)
            );

            this._wheels.forEach(wheel => {
                if (wheel.isFront) {
                    Body.applyForce(wheel.body, wheel.body.position, accelerationForce);
                }
            });
        }

        // Handle braking
        if (this._braking && isGrounded) {
            // Apply braking force opposite to velocity
            const {velocity} = this._body;
            const speed = Vector.magnitude(velocity);

            if (speed > 0.1) {
                const brakeForce = Vector.mult(
                    Vector.neg(Vector.normalise(velocity)),
                    this._acceleration * 1.5
                );

                Body.applyForce(this._body, this._body.position, brakeForce);
            }
        }

        // Handle steering
        if (isGrounded && Math.abs(this._steering) > 0.1) {
            const steerFactor = this._handling * 0.05 * this._steering;

            // Apply torque to body for steering
            Body.setAngularVelocity(this._body, steerFactor);

            // Adjust front wheels for steering
            this._wheels.forEach(wheel => {
                if (wheel.isFront) {
                    const steeringOffset = Vector.rotate(
                        { x: 0, y: 1 },
                        this._steering * 0.3
                    );
                    Body.setAngle(wheel.body, this._body.angle + steeringOffset.x);
                }
            });
        }

        // Handle handbrake - reduce grip dramatically on rear wheels
        if (this._handbrake && isGrounded) {
            this._wheels.forEach(wheel => {
                if (!wheel.isFront) {
                    Body.setFriction(wheel.body, this._grip * 0.2);
                }
            });
        }

        // Limit max speed
        const currentSpeed = Vector.magnitude(this._body.velocity);
        this._speed = currentSpeed;

        if (currentSpeed > this._maxSpeed * (this._boostTime > 0 ? 1.5 : 1)) {
            const limitedVelocity = Vector.mult(
                Vector.normalise(this._body.velocity),
                this._maxSpeed * (this._boostTime > 0 ? 1.5 : 1)
            );
            Body.setVelocity(this._body, limitedVelocity);
        }
    }

    setAccelerating(value) {
        this._accelerating = value;
    }

    setBraking(value) {
        this._braking = value;
    }

    setSteering(value) {
        // Value should be between -1 and 1
        this._steering = Math.max(-1, Math.min(1, value));
    }

    setHandbrake(value) {
        this._handbrake = value;
    }

    applyBoost(force) {
        this._boostTime = 2000; // 2 seconds of boost

        // Apply immediate impulse in forward direction
        const forwardVector = this._getForwardVector();
        const boostForce = Vector.mult(forwardVector, force * 100);
        Body.applyForce(this._body, this._body.position, boostForce);
    }

    applyJump(force) {
        // Apply upward force for jumps
        const jumpForce = { x: 0, y: -force * 100 };
        Body.applyForce(this._body, this._body.position, jumpForce);
    }

    applySlip(factor) {
        this._slipTime = 1500; // 1.5 seconds of reduced grip
    }

    _getForwardVector() {
        // Get unit vector in direction kart is facing
        return Vector.rotate(
            { x: 0, y: -1 },
            this._body.angle
        );
    }

    getPosition() {
        return this._body ? this._body.position : { x: 0, y: 0 };
    }

    setPosition(x, y) {
        if (this._body) {
            Body.setPosition(this._body, { x, y });

            // Also update wheels
            this._wheels.forEach((wheel, index) => {
                const offset = {
                    x: index % 2 === 0 ? -15 : 15, // left vs right
                    y: index < 2 ? -20 : 20        // front vs back
                };
                Body.setPosition(wheel.body, {
                    x: x + offset.x,
                    y: y + offset.y
                });
            });
        }
    }
}

customElements.define('zk-kart', ZeroKart);
