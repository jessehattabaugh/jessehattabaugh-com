export class KartGame extends HTMLElement {
	constructor() {
		super();
		console.debug('🏎️game constructed');
	}
	connectedCallback() {
		console.debug('🏎️game connected');
	}
	disconnectedCallback() {
		console.debug('🏎️game disconnected');
	}
};