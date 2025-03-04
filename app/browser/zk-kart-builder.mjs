export class ZeroKartBuilder extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });

		// Available kart types with their stats
		this._kartTypes = [
			{
				id: 'standard',
				name: 'Standard',
				color: 'red',
				acceleration: 0.005,
				maxSpeed: 5.0,
				handling: 0.9,
				grip: 0.8,
			},
			{
				id: 'racer',
				name: 'Racer',
				color: 'blue',
				acceleration: 0.004,
				maxSpeed: 6.0,
				handling: 0.7,
				grip: 0.7,
			},
			{
				id: 'heavy',
				name: 'Heavy',
				color: 'green',
				acceleration: 0.003,
				maxSpeed: 4.0,
				handling: 0.6,
				grip: 1.0,
			},
			{
				id: 'drift',
				name: 'Drifter',
				color: 'yellow',
				acceleration: 0.006,
				maxSpeed: 5.5,
				handling: 1.0,
				grip: 0.6,
			},
			{
				id: 'balanced',
				name: 'Balanced',
				color: 'purple',
				acceleration: 0.0045,
				maxSpeed: 5.2,
				handling: 0.8,
				grip: 0.8,
			},
		];

		// Available driver sprites
		this._driverTypes = [
			{ id: 'mario', name: 'Red Racer', imgSrc: '/images/drivers/driver-red.png' },
			{ id: 'luigi', name: 'Green Racer', imgSrc: '/images/drivers/driver-green.png' },
			{ id: 'peach', name: 'Pink Racer', imgSrc: '/images/drivers/driver-pink.png' },
			{ id: 'toad', name: 'Blue Racer', imgSrc: '/images/drivers/driver-blue.png' },
			{ id: 'yoshi', name: 'Yellow Racer', imgSrc: '/images/drivers/driver-yellow.png' },
		];

		// Current selections
		this._selectedKart = this._kartTypes[0];
		this._selectedDriver = this._driverTypes[0];
	}

	connectedCallback() {
		this._render();
		this._attachEventListeners();
	}

	_render() {
		this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: 'Arial', sans-serif;
                }

                .builder-container {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }

                .preview {
                    background-color: #333;
                    border-radius: 8px;
                    padding: 20px;
                    text-align: center;
                    color: white;
                    min-height: 150px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    overflow: hidden;
                }

                .preview-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 10px;
                }

                .kart-preview {
                    width: 120px;
                    height: 70px;
                    background-color: var(--kart-color, #f00);
                    border-radius: 10px;
                    position: relative;
                }

                .driver-preview {
                    width: 40px;
                    height: 40px;
                    background-color: #777;
                    border-radius: 50%;
                    position: absolute;
                    top: 15px;
                    left: 40px;
                    background-size: contain;
                    background-position: center;
                    background-repeat: no-repeat;
                }

                .wheels {
                    position: absolute;
                    width: 20px;
                    height: 20px;
                    background-color: #222;
                    border-radius: 50%;
                }

                .wheel1 { top: 55px; left: 15px; }
                .wheel2 { top: 55px; left: 85px; }

                .options-container {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }

                .option-section {
                    background-color: white;
                    border-radius: 8px;
                    padding: 15px;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                }

                .option-section h3 {
                    margin-top: 0;
                    margin-bottom: 10px;
                    color: #333;
                }

                .carousel {
                    display: flex;
                    gap: 10px;
                    overflow-x: auto;
                    padding: 10px 0;
                    scroll-behavior: smooth;
                    -webkit-overflow-scrolling: touch;
                }

                .carousel-item {
                    min-width: 100px;
                    padding: 10px;
                    border-radius: 6px;
                    background-color: #f0f0f0;
                    text-align: center;
                    cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                }

                .carousel-item:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                }

                .carousel-item.selected {
                    background-color: #d0e0ff;
                    border: 2px solid #4080ff;
                }

                .kart-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }

                .kart-color {
                    width: 60px;
                    height: 30px;
                    margin: 5px auto;
                    border-radius: 5px;
                }

                .driver-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }

                .driver-img {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background-color: #ddd;
                    margin: 5px auto;
                    background-size: contain;
                    background-position: center;
                    background-repeat: no-repeat;
                }

                .stats {
                    margin-top: 10px;
                    display: grid;
                    grid-template-columns: auto 1fr;
                    gap: 5px 10px;
                    font-size: 14px;
                    text-align: left;
                }

                .stat-label {
                    font-weight: bold;
                }

                .stat-bar {
                    height: 10px;
                    background-color: #ddd;
                    border-radius: 5px;
                    position: relative;
                    overflow: hidden;
                }

                .stat-fill {
                    height: 100%;
                    background-color: #4080ff;
                    width: var(--fill-width, 50%);
                }

                .play-button {
                    background-color: #4CAF50;
                    color: white;
                    padding: 10px 20px;
                    border: none;
                    border-radius: 5px;
                    font-size: 16px;
                    cursor: pointer;
                    margin-top: 15px;
                    transition: background-color 0.3s;
                }

                .play-button:hover {
                    background-color: #45a049;
                }

                @media (min-width: 768px) {
                    .builder-container {
                        flex-direction: row;
                    }

                    .preview {
                        flex: 1;
                        min-height: 300px;
                    }

                    .kart-preview {
                        width: 150px;
                        height: 90px;
                    }

                    .driver-preview {
                        width: 50px;
                        height: 50px;
                        top: 20px;
                        left: 50px;
                    }

                    .wheels {
                        width: 25px;
                        height: 25px;
                    }

                    .wheel1 { top: 70px; left: 20px; }
                    .wheel2 { top: 70px; left: 105px; }

                    .options-container {
                        flex: 1;
                    }
                }
            </style>

            <div class="builder-container">
                <div class="preview">
                    <div class="preview-content">
                        <div class="kart-preview" style="--kart-color: ${this._selectedKart.color}">
                            <div class="driver-preview" style="background-image: url(${
								this._selectedDriver.imgSrc
							})"></div>
                            <div class="wheels wheel1"></div>
                            <div class="wheels wheel2"></div>
                        </div>
                        <h3>${this._selectedKart.name} with ${this._selectedDriver.name}</h3>

                        <div class="stats">
                            <div class="stat-label">Speed:</div>
                            <div class="stat-bar">
                                <div class="stat-fill" style="--fill-width: ${
									(this._selectedKart.maxSpeed / 6) * 100
								}%"></div>
                            </div>

                            <div class="stat-label">Acceleration:</div>
                            <div class="stat-bar">
                                <div class="stat-fill" style="--fill-width: ${
									(this._selectedKart.acceleration / 0.006) * 100
								}%"></div>
                            </div>

                            <div class="stat-label">Handling:</div>
                            <div class="stat-bar">
                                <div class="stat-fill" style="--fill-width: ${
									this._selectedKart.handling * 100
								}%"></div>
                            </div>

                            <div class="stat-label">Grip:</div>
                            <div class="stat-bar">
                                <div class="stat-fill" style="--fill-width: ${
									this._selectedKart.grip * 100
								}%"></div>
                            </div>
                        </div>

                        <button class="play-button">Race with this kart</button>
                    </div>
                </div>

                <div class="options-container">
                    <div class="option-section">
                        <h3>Choose your kart</h3>
                        <div class="carousel kart-carousel">
                            ${this._kartTypes
								.map((kart) => {
									return `
                                <div class="carousel-item kart-item ${
									kart.id === this._selectedKart.id ? 'selected' : ''
								}" data-kart-id="${kart.id}">
                                    <div class="kart-color" style="background-color: ${
										kart.color
									}"></div>
                                    <div>${kart.name}</div>
                                </div>
                            `;
								})
								.join('')}
                        </div>
                    </div>

                    <div class="option-section">
                        <h3>Choose your driver</h3>
                        <div class="carousel driver-carousel">
                            ${this._driverTypes
								.map((driver) => {
									return `
                                <div class="carousel-item driver-item ${
									driver.id === this._selectedDriver.id ? 'selected' : ''
								}" data-driver-id="${driver.id}">
                                    <div class="driver-img" style="background-image: url(${
										driver.imgSrc
									})"></div>
                                    <div>${driver.name}</div>
                                </div>
                            `;
								})
								.join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
	}

	_attachEventListeners() {
		// Kart selection
		const kartItems = this.shadowRoot.querySelectorAll('.kart-item');
		kartItems.forEach((item) => {
			item.addEventListener('click', () => {
				const kartId = item.getAttribute('data-kart-id');
				this._selectedKart = this._kartTypes.find((kart) => {
					return kart.id === kartId;
				});
				this._render();
			});
		});

		// Driver selection
		const driverItems = this.shadowRoot.querySelectorAll('.driver-item');
		driverItems.forEach((item) => {
			item.addEventListener('click', () => {
				const driverId = item.getAttribute('data-driver-id');
				this._selectedDriver = this._driverTypes.find((driver) => {
					return driver.id === driverId;
				});
				this._render();
			});
		});

		// Play button
		const playButton = this.shadowRoot.querySelector('.play-button');
		playButton.addEventListener('click', () => {
			this._startRace();
		});
	}

	_startRace() {
		// Find the game element
		const gameElement = document.querySelector('zk-game');
		if (!gameElement) {
			return;
		}

		// Find and remove the existing kart
		const existingKart = gameElement.querySelector('zk-kart');
		if (existingKart) {
			existingKart.remove();
		}

		// Create a new kart with the selected properties
		const newKart = document.createElement('zk-kart');
		newKart.id = 'player1';
		newKart.setAttribute('type', this._selectedKart.id);
		newKart.setAttribute('color', this._selectedKart.color);
		newKart.setAttribute('acceleration', this._selectedKart.acceleration);
		newKart.setAttribute('max-speed', this._selectedKart.maxSpeed);
		newKart.setAttribute('handling', this._selectedKart.handling);
		newKart.setAttribute('grip', this._selectedKart.grip);
		newKart.setAttribute('driver', this._selectedDriver.id);
		newKart.setAttribute('driver-img', this._selectedDriver.imgSrc);

		// Add the new kart to the game
		gameElement.appendChild(newKart);

		// Scroll to the game
		gameElement.scrollIntoView({ behavior: 'smooth' });

		// Tell the game to restart with the new kart
		gameElement.restartGame();
	}
}

// Register the component
customElements.define('zk-kart-builder', ZeroKartBuilder);
