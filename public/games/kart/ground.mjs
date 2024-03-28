export class Ground extends HTMLElement {
	constructor() {
		super();
		console.debug('ground constructed');
	}
	connectedCallback() {
		console.debug('ground connected');
	}
	disconnectedCallback() {
		console.debug('ground disconnected');
	}
};