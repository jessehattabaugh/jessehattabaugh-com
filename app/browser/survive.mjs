import enhance from '@enhance/element';
import render from '../elements/jh-survive.mjs';

let playerDirection = 'right';
let playerMoving = false;

/** sets the player's direction when a key is pressed
 * @param {KeyboardEvent} event
 * @see https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent
 */
function doKeydown(event) {
	const { key } = event;
	if (['ArrowLeft', 'a'].includes(key)) {
		console.log('⬅️ keydown left', { key });
		playerDirection = 'left';
		playerMoving = true;
	}
	if (['ArrowRight', 'd'].includes(key)) {
		console.log('➡️ keydown right', { key });
		playerDirection = 'right';
		playerMoving = true;
	}
}

/** stops the player from moving when a key is released
 * @see https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent
 */
function doKeyup() {
	playerMoving = false;
}

/** @type {number} */
let frameRequestId;

/** moves the player and the ball
 * @see https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
 */
function doFrame() {
	if (playerMoving) {
		// move the world under the player
		
	}
	// recurse the loop
	frameRequestId = window.requestAnimationFrame(doFrame);
}

let thePlayer;
let theWorld;

/** adds game control listeners starts game loop
 * @see https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
 */
function connected() {
	console.log('🎮 custom element connected', { this: this });
	({ thePlayer, theWorld } = this.children);
	window.addEventListener('keydown', doKeydown);
	window.addEventListener('keyup', doKeyup);
	frameRequestId = window.requestAnimationFrame(doFrame);
}

/** removes game control listeners cancels game loop
 * @see https://developer.mozilla.org/en-US/docs/Web/API/window/cancelAnimationFrame
 */
function disconnected() {
	window.removeEventListener('keydown', doKeydown);
	window.removeEventListener('keyup', doKeyup);
	window.cancelAnimationFrame(frameRequestId);
}

/** register the custom element */
enhance('jh-pong', { connected, disconnected, render });
