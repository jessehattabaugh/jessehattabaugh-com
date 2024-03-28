export class Game extends HTMLElement {

	constructor() {
		super();
		this.handleKeyDown = this.handleKeyDown.bind(this);
		console.debug('🏎️game constructed');
	}

	rotation = 0;

	handleKeyDown(event) {
		const {key} = event;
		console.debug('🏎️game keydown', {key});
	}
	
	connectedCallback() {
		this.addEventListener('keydown', this.handleKeyDown);
		console.debug('🏎️game connected');
	}
	disconnectedCallback() {
		this.removeEventListener('keydown', this.handleKeyDown);
		console.debug('🏎️game disconnected');
	}
};