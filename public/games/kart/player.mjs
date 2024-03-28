export class Player extends HTMLElement {
	constructor() {
		super();
		console.debug('player constructed');
	}
	connectedCallback() {
		console.debug('player connected');
	}
	disconnectedCallback() {
		console.debug('player disconnected');
	}
};