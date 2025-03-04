export class ZeroKartTouchControls extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        // Control state
        this._kart = null;
        this._isAccelerating = false;
        this._isBraking = false;
        this._steeringValue = 0;
        this._isHandbrake = false;

        // Touch tracking
        this._steeringTouchId = null;
        this._accelerateTouchId = null;
        this._brakeTouchId = null;

        // Bind methods
        this._handlePointerDown = this._handlePointerDown.bind(this);
        this._handlePointerMove = this._handlePointerMove.bind(this);
        this._handlePointerUp = this._handlePointerUp.bind(this);
    }

    connectedCallback() {
        this._render();
        this._setupEventListeners();
    }

    disconnectedCallback() {
        this._cleanupEventListeners();
    }

    _render() {
        const style = document.createElement('style');
        style.textContent = `
            :host {
                position: absolute;
                bottom: 20px;
                left: 0;
                width: 100%;
                display: flex;
                justify-content: space-between;
                pointer-events: none;
                z-index: 100;
                touch-action: none;
            }

            .steering-wheel {
                width: 120px;
                height: 120px;
                background: rgba(255, 255, 255, 0.2);
                border: 2px solid rgba(255, 255, 255, 0.5);
                border-radius: 50%;
                display: flex;
                justify-content: center;
                align-items: center;
                margin-left: 20px;
                pointer-events: auto;
            }

            .steering-indicator {
                width: 10px;
                height: 40px;
                background: white;
                border-radius: 5px;
                transform: rotate(0deg);
            }

            .pedals {
                display: flex;
                margin-right: 20px;
                gap: 20px;
                pointer-events: auto;
            }

            .pedal {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                display: flex;
                justify-content: center;
                align-items: center;
                color: white;
                font-weight: bold;
                user-select: none;
            }

            .pedal.accelerate {
                background: rgba(0, 255, 0, 0.3);
                border: 2px solid rgba(0, 255, 0, 0.6);
            }

            .pedal.accelerate.active {
                background: rgba(0, 255, 0, 0.6);
                transform: scale(0.9);
            }

            .pedal.brake {
                background: rgba(255, 0, 0, 0.3);
                border: 2px solid rgba(255, 0, 0, 0.6);
            }

            .pedal.brake.active {
                background: rgba(255, 0, 0, 0.6);
                transform: scale(0.9);
            }

            .pedal.handbrake {
                background: rgba(255, 255, 0, 0.3);
                border: 2px solid rgba(255, 255, 0, 0.6);
            }

            .pedal.handbrake.active {
                background: rgba(255, 255, 0, 0.6);
                transform: scale(0.9);
            }
        `;

        const html = `
            <div class="steering-wheel" id="steering">
                <div class="steering-indicator" id="steering-indicator"></div>
            </div>
            <div class="pedals">
                <div class="pedal handbrake" id="handbrake">H</div>
                <div class="pedal brake" id="brake">B</div>
                <div class="pedal accelerate" id="accelerate">A</div>
            </div>
        `;

        this.shadowRoot.innerHTML = '';
        this.shadowRoot.appendChild(style);

        const container = document.createElement('div');
        container.innerHTML = html;
        this.shadowRoot.appendChild(container);

        // Store elements for later use
        this._steeringEl = this.shadowRoot.getElementById('steering');
        this._steeringIndicatorEl = this.shadowRoot.getElementById('steering-indicator');
        this._accelerateEl = this.shadowRoot.getElementById('accelerate');
        this._brakeEl = this.shadowRoot.getElementById('brake');
        this._handbrakeEl = this.shadowRoot.getElementById('handbrake');
    }

    _setupEventListeners() {
        // Use pointer events for better cross-device support
        this.shadowRoot.addEventListener('pointerdown', this._handlePointerDown);
        window.addEventListener('pointermove', this._handlePointerMove);
        window.addEventListener('pointerup', this._handlePointerUp);
        window.addEventListener('pointercancel', this._handlePointerUp);
    }

    _cleanupEventListeners() {
        this.shadowRoot.removeEventListener('pointerdown', this._handlePointerDown);
        window.removeEventListener('pointermove', this._handlePointerMove);
        window.removeEventListener('pointerup', this._handlePointerUp);
        window.removeEventListener('pointercancel', this._handlePointerUp);
    }

    _handlePointerDown(event) {
        const {target} = event;

        if (target === this._steeringEl || target === this._steeringIndicatorEl) {
            this._steeringTouchId = event.pointerId;
            this._steeringEl.setPointerCapture(event.pointerId);
            this._updateSteering(event);
        } else if (target === this._accelerateEl) {
            this._accelerateTouchId = event.pointerId;
            this._accelerateEl.setPointerCapture(event.pointerId);
            this._setAccelerating(true);
        } else if (target === this._brakeEl) {
            this._brakeTouchId = event.pointerId;
            this._brakeEl.setPointerCapture(event.pointerId);
            this._setBraking(true);
        } else if (target === this._handbrakeEl) {
            this._handbrakeTouchId = event.pointerId;
            this._handbrakeEl.setPointerCapture(event.pointerId);
            this._setHandbrake(true);
        }
    }

    _handlePointerMove(event) {
        if (event.pointerId === this._steeringTouchId) {
            this._updateSteering(event);
        }
    }

    _handlePointerUp(event) {
        if (event.pointerId === this._steeringTouchId) {
            this._steeringTouchId = null;
            this._resetSteering();
        } else if (event.pointerId === this._accelerateTouchId) {
            this._accelerateTouchId = null;
            this._setAccelerating(false);
        } else if (event.pointerId === this._brakeTouchId) {
            this._brakeTouchId = null;
            this._setBraking(false);
        } else if (event.pointerId === this._handbrakeTouchId) {
            this._handbrakeTouchId = null;
            this._setHandbrake(false);
        }
    }

    _updateSteering(event) {
        const rect = this._steeringEl.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;

        // Calculate steering value based on horizontal distance from center
        const deltaX = event.clientX - centerX;
        const maxDistance = rect.width / 2;
        let steeringValue = deltaX / maxDistance;

        // Clamp between -1 and 1
        steeringValue = Math.max(-1, Math.min(1, steeringValue));
        this._steeringValue = steeringValue;

        // Update visual indicator
        this._steeringIndicatorEl.style.transform = `rotate(${steeringValue * 45}deg)`;

        // Update kart if connected
        if (this._kart) {
            this._kart.setSteering(steeringValue);
        }
    }

    _resetSteering() {
        this._steeringValue = 0;
        this._steeringIndicatorEl.style.transform = 'rotate(0deg)';

        // Update kart if connected
        if (this._kart) {
            this._kart.setSteering(0);
        }
    }

    _setAccelerating(state) {
        this._isAccelerating = state;
        if (state) {
            this._accelerateEl.classList.add('active');
        } else {
            this._accelerateEl.classList.remove('active');
        }

        // Update kart if connected
        if (this._kart) {
            this._kart.setAccelerating(state);
        }
    }

    _setBraking(state) {
        this._isBraking = state;
        if (state) {
            this._brakeEl.classList.add('active');
        } else {
            this._brakeEl.classList.remove('active');
        }

        // Update kart if connected
        if (this._kart) {
            this._kart.setBraking(state);
        }
    }

    _setHandbrake(state) {
        this._isHandbrake = state;
        if (state) {
            this._handbrakeEl.classList.add('active');
        } else {
            this._handbrakeEl.classList.remove('active');
        }

        // Update kart if connected
        if (this._kart) {
            this._kart.setHandbrake(state);
        }
    }

    connectToKart(kart) {
        this._kart = kart;
    }
}

customElements.define('zk-touch-controls', ZeroKartTouchControls);
