import enhance from '@enhance/element';
import render from '../elements/jh/pong.mjs';

/** @type {HTMLDivElement}} */
let theBall;
/** @type {HTMLDivElement}} */
let playerPaddle;
/** @type {HTMLDivElement}} */
let computerPaddle;
/** @type {HTMLDivElement}} */
let theTable;
/** @type {HTMLDivElement}} */
let playerScore;
/** @type {HTMLDivElement}} */
let computerScore;
/** @type {number} */
let frameRequestId = null;
/** @type {number} -100-100 */
let ballSpeedX = -1;
/** @type {number} -100-100 */
let ballSpeedY = 0;
/**  @type {number} 0-100 */
let ballX = 50;
/** @type {number} 0-100  */
let ballY = 50;
/** * @type {number} -100-100 */
let playerSpeed = 0;
/** @type {number} -100-100 */
let computerSpeed = -1;
/** @type {number} 0-100 */
let playerPosition = 50;
/** @type {number} 0-100 */
let computerPosition = 50;

/**
 * sets the player's direction when a key is pressed
 * @param {KeyboardEvent} event
 * @returns {void}
 * @see https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent
 */
function keyDowned(event) {
	const { key } = event;
	if (['ArrowUp', 'w'].includes(key)) {
		playerSpeed = -1;
	}
	if (['ArrowDown', 's'].includes(key)) {
		playerSpeed = 1;
	}
}

/**
 * stops the player from moving when a key is released
 * @returns {void}
 * @see https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent
 */
function keyUpped() {
	playerSpeed = 0;
}

/**
 * moves the player and the ball
 * @returns {void}
 * @see https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
 */
function framed() {
	// bounce off the top and bottom
	if (ballY <= 0 || ballY >= 100) {
		ballSpeedY *= -1;
	}

	// ball has reached the left or right side
	if (ballX === 5 || ballX === 95) {
		const playerTending = ballX < 50;
		const tenderPosition = playerTending ? playerPosition : computerPosition;
		const ballToPaddleDistance = Math.abs(tenderPosition - ballY);
		if (ballToPaddleDistance > 7.5) {
			const opponentScore = playerTending ? computerScore : playerScore;
			opponentScore.innerText = String(parseInt(opponentScore.innerText) + 1);

			// put the ball in front of scoring player after a second
			setTimeout(() => {
				ballY = playerTending ? computerPosition : playerPosition;
				ballX = 50;
				ballSpeedX *= -1;
				ballSpeedY = Math.random() * 2 - 1.5;
			}, 2000);
		} else {
			// bounce off the paddle
			ballSpeedX *= -1;
			ballSpeedY = ballSpeedY + playerSpeed;
		}
	}

	// move the ball
	ballX += ballSpeedX;
	ballY += ballSpeedY;
	theBall.style.left = `${ballX}%`;
	theBall.style.top = `${ballY}%`;

	// move the player paddle
	const nextPosition = playerPosition + playerSpeed;
	if (playerSpeed && nextPosition >= 0 && nextPosition <= 100) {
		playerPosition = nextPosition;
		playerPaddle.style.top = `${playerPosition}%`;
	}

	// move the computer paddle
	const nextComputerPosition = computerPosition + computerSpeed;
	computerPosition = nextComputerPosition;
	computerPaddle.style.top = `${computerPosition}%`;
	if (nextComputerPosition === 0 || nextComputerPosition === 100) {
		computerSpeed *= -1;
	}

	// loop
	frameRequestId = window.requestAnimationFrame(framed);
}

/**
 * adds game control listeners
 * starts game loop
 * @returns {void}
 * @see https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
 * @see https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
 */
function connected() {
	console.log('🎮', { this: this });
	({ computerPaddle, theTable, playerPaddle, theBall } = this.children);
	// @ts-ignore
	({ computerScore, playerScore } = theTable.children);
	window.addEventListener('keydown', keyDowned);
	window.addEventListener('keyup', keyUpped);
	frameRequestId = window.requestAnimationFrame(framed);
}

/**
 * removes game control listeners
 * cancels game loop
 * @returns {void}
 * @see https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener
 * @see https://developer.mozilla.org/en-US/docs/Web/API/window/cancelAnimationFrame
 */
function disconnected() {
	window.removeEventListener('keydown', keyDowned);
	window.removeEventListener('keyup', keyUpped);
	window.cancelAnimationFrame(frameRequestId);
}

enhance('jh-pong', { connected, disconnected, render });
