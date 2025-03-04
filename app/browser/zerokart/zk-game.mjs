import { GameBase } from '../game-base.mjs';
import Matter from 'matter-js';

const { Body, Composite, Events, Vector, World } = Matter;

export class ZeroKartGame extends GameBase {
    constructor() {
        super();
        this._karts = [];
        this._track = null;
        this._checkpoints = [];
        this._raceStarted = false;
        this._lapCount = 3;
        this._scoreBoard = {};
        this._gamepadState = {};
        this._touchControls = null;
        this._gameLoop = this._gameLoop.bind(this);
        this._lastTimestamp = 0;
    }

    connectedCallback() {
        super.connectedCallback();
        // Override gravity for top-down racing
        this._engine.gravity.y = 0;

        this._render.options.background = '#333333';
        this._render.options.wireframes = false;

        // Process child elements (karts, track)
        this._initializeGameElements();

        // Set up input handlers
        this._setupInputHandlers();

        // Create touch controls if needed
        this._createTouchControlsIfNeeded();

        // Start game loop
        requestAnimationFrame(this._gameLoop);
    }

    _gameLoop(timestamp) {
        const deltaTime = timestamp - (this._lastTimestamp || timestamp);
        this._lastTimestamp = timestamp;

        // Update karts based on input
        this._updateKarts(deltaTime);

        // Check race progress
        this._checkRaceProgress();

        // Update camera to follow player
        this._updateCamera();

        requestAnimationFrame(this._gameLoop);
    }

    _initializeGameElements() {
        // Get track element
        const trackElement = this.querySelector('zk-track');
        if (trackElement) {
            this._track = trackElement;
            // Add track boundaries and obstacles to physics world
            this._track.initializePhysics(this._engine.world);
            this._checkpoints = this._track.getCheckpoints();
        }

        // Get kart elements
        const kartElements = this.querySelectorAll('zk-kart');
        kartElements.forEach((kartElement, index) => {
            // Initialize kart physics
            kartElement.initializePhysics(this._engine.world);

            // Track kart for game logic
            this._karts.push(kartElement);

            // Setup scoring for this kart
            this._scoreBoard[kartElement.id] = {
                checkpointIndex: 0,
                laps: 0,
                finished: false,
                time: 0
            };

            // Position karts at starting positions
            const startPos = this._track?.getStartPosition(index) || { x: 100 + (index * 50), y: 100 };
            kartElement.setPosition(startPos.x, startPos.y);
        });
    }

    _setupInputHandlers() {
        // Keyboard input
        window.addEventListener('keydown', (e) => {return this._handleKeyboardInput(e, true)});
        window.addEventListener('keyup', (e) => {return this._handleKeyboardInput(e, false)});

        // Gamepad input
        window.addEventListener('gamepadconnected', (e) => {return this._handleGamepadConnected(e)});
        window.addEventListener('gamepaddisconnected', (e) => {return this._handleGamepadDisconnected(e)});

        // Touch/mouse events handled by touch controls component
    }

    _handleKeyboardInput(event, isKeyDown) {
        // Map keys to kart actions
        const player1Kart = this._karts[0];
        if (!player1Kart) {return;}

        switch (event.key) {
            case 'ArrowUp':
                player1Kart.setAccelerating(isKeyDown);
                break;
            case 'ArrowDown':
                player1Kart.setBraking(isKeyDown);
                break;
            case 'ArrowLeft':
                player1Kart.setSteering(-isKeyDown ? 1 : 0);
                break;
            case 'ArrowRight':
                player1Kart.setSteering(isKeyDown ? 1 : 0);
                break;
            case ' ':
                player1Kart.setHandbrake(isKeyDown);
                break;
        }
    }

    _handleGamepadConnected(event) {
        console.log(`Gamepad connected: ${event.gamepad.id}`);
        this._gamepadState[event.gamepad.index] = event.gamepad;
        this._pollGamepads();
    }

    _handleGamepadDisconnected(event) {
        console.log(`Gamepad disconnected: ${event.gamepad.id}`);
        delete this._gamepadState[event.gamepad.index];
    }

    _pollGamepads() {
        if (Object.keys(this._gamepadState).length === 0) {return;}

        // Get fresh gamepad data
        const gamepads = navigator.getGamepads();

        // Update each kart based on its gamepad
        for (let i = 0; i < Math.min(gamepads.length, this._karts.length); i++) {
            const gamepad = gamepads[i];
            const kart = this._karts[i];

            if (gamepad && kart) {
                // Analog stick for steering (horizontal axis)
                const steeringValue = gamepad.axes[0];
                kart.setSteering(Math.abs(steeringValue) > 0.1 ? steeringValue : 0);

                // Buttons for acceleration/braking (usually A/X to accelerate, B/O to brake)
                kart.setAccelerating(gamepad.buttons[0].pressed);
                kart.setBraking(gamepad.buttons[1].pressed);
                kart.setHandbrake(gamepad.buttons[2].pressed);
            }
        }

        // Continue polling at 60fps
        requestAnimationFrame(() => {return this._pollGamepads()});
    }

    _createTouchControlsIfNeeded() {
        // Only create touch controls on touch devices
        if ('ontouchstart' in window || navigator.maxTouchPoints) {
            this._touchControls = document.createElement('zk-touch-controls');
            this.shadowRoot.appendChild(this._touchControls);

            // Connect touch controls to the first kart
            if (this._karts[0]) {
                this._touchControls.connectToKart(this._karts[0]);
            }
        }
    }

    _updateKarts(deltaTime) {
        this._karts.forEach(kart => {
            kart.update(deltaTime);
        });
    }

    _checkRaceProgress() {
        this._karts.forEach(kart => {
            const kartId = kart.id;
            const kartScore = this._scoreBoard[kartId];
            if (kartScore.finished) {return;}

            // Get kart position
            const kartPos = kart.getPosition();

            // Check if kart passed the next checkpoint
            const nextCheckpoint = this._checkpoints[kartScore.checkpointIndex];
            if (nextCheckpoint && this._isKartAtCheckpoint(kartPos, nextCheckpoint)) {
                // Move to the next checkpoint
                kartScore.checkpointIndex = (kartScore.checkpointIndex + 1) % this._checkpoints.length;

                // If completed a lap
                if (kartScore.checkpointIndex === 0) {
                    kartScore.laps++;
                    console.log(`${kartId} completed lap ${kartScore.laps}`);

                    // Check for race finish
                    if (kartScore.laps >= this._lapCount) {
                        kartScore.finished = true;
                        console.log(`${kartId} finished the race!`);
                    }
                }
            }
        });
    }

    _isKartAtCheckpoint(kartPos, checkpoint) {
        // Simple distance-based checkpoint detection
        const dx = checkpoint.x - kartPos.x;
        const dy = checkpoint.y - kartPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < checkpoint.radius;
    }

    _updateCamera() {
        // Follow the first kart (player)
        const playerKart = this._karts[0];
        if (playerKart) {
            const kartPos = playerKart.getPosition();
            const viewportWidth = this._render.options.width;
            const viewportHeight = this._render.options.height;

            // Center viewport on kart
            this._render.lookAt(
                kartPos,
                {
                    x: viewportWidth / 2,
                    y: viewportHeight / 2
                }
            );
        }
    }

    // Override collision handling from GameBase
    _handleCollisions(pairs) {
        pairs.forEach(pair => {
            const { bodyA, bodyB } = pair;

            // Check kart-obstacle collisions
            if (bodyA.parent.kartId && bodyB.label.includes('obstacle')) {
                this._handleKartObstacleCollision(bodyA.parent.kartId, bodyB);
            }
            else if (bodyB.parent.kartId && bodyA.label.includes('obstacle')) {
                this._handleKartObstacleCollision(bodyB.parent.kartId, bodyA);
            }

            // Check kart-kart collisions
            if (bodyA.parent.kartId && bodyB.parent.kartId) {
                this._handleKartKartCollision(bodyA.parent, bodyB.parent);
            }
        });
    }

    _handleKartObstacleCollision(kartId, obstacleBody) {
        const kart = this._karts.find(k => {return k.id === kartId});
        const {obstacleType} = obstacleBody;

        if (kart && obstacleType) {
            switch (obstacleType) {
                case 'ramp':
                    kart.applyJump(obstacleBody.jumpForce || 0.1);
                    break;
                case 'bounce-pad':
                    kart.applyBoost(obstacleBody.boostForce || 0.05);
                    break;
                case 'oil-slick':
                    kart.applySlip(obstacleBody.slipFactor || 0.8);
                    break;
            }
        }
    }

    _handleKartKartCollision(kartA, kartB) {
        // Implement kart-to-kart interaction logic
        // Could add bumping effects, etc.
    }
}

// Register the component
customElements.define('zk-game', ZeroKartGame);
