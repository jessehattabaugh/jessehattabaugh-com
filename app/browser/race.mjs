// import enhance from '@enhance/element';
// import render from '../elements/jh-race.mjs';

// /** @type {number}*/
// let frameRequestId = null;

// function frameHandler() {
// 	frameRequestId = window.requestAnimationFrame(frameHandler);
// }

// /** starts the anmimation loop */
// function connected() {
// 	console.log('🎮connected', { this: this });
// 	frameRequestId = window.requestAnimationFrame(frameHandler);
// }

// /** stops the animation loop */
// function disconnected() {
// 	console.log('🎮disconnected', { this: this });
// 	window.cancelAnimationFrame(frameRequestId);
// }

// enhance('jh-race', { connected, disconnected, render });

import { LitElement, html, css } from 'lit';

export class JHRace extends LitElement {

	static styles = css``;

	constructor() {
		super();
	}

	render() {
		return html`<main>
			<h1>🚘</h1>
		</main>`;
	}
}
customElements.define('jh-race', JHRace);


export class JHTrack extends LitElement {
	static styles = css``;

	constructor() {
		super();
	}

	render() {
		return html`<ul>
			<h1>🚘</h1>
		</ul>`;
	}
}
customElements.define('jh-race', JHRace);