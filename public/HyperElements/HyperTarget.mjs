/**
 * base class for elements that listen to fetch events
 */
export class HyperTarget extends HTMLElement {
	constructor() {
		super();
		this.handleFetchEvent = this.handleFetchEvent.bind(this);
		// console.debug('🛠️ HyperTarget constructed');
	}

	connectedCallback() {
		this.from = (this.getAttribute('from') || '').split(',').map((id) => {
			return id.trim();
		});
		document.addEventListener('hyper-fetch-loading', this.handleFetchEvent);
		document.addEventListener('hyper-fetch-success', this.handleFetchEvent);
		document.addEventListener('hyper-fetch-error', this.handleFetchEvent);
		document.removeEventListener('hyper-fetch-end', this.handleFetchEvent);
		//console.debug('🔗 HyperTarget event listeners added', { for: this.for });
	}

	disconnectedCallback() {
		document.removeEventListener('hyper-fetch-loading', this.handleFetchEvent);
		document.removeEventListener('hyper-fetch-success', this.handleFetchEvent);
		document.removeEventListener('hyper-fetch-error', this.handleFetchEvent);
		document.removeEventListener('hyper-fetch-end', this.handleFetchEvent);
		//console.debug('🧹 HyperTarget event listeners removed', {});
	}

	/** Abstract method to handle fetch events. Override this method in your subclass.
	 * @param {CustomEvent<import('../../../types').FetchDetails>} event - The event triggered on fetch start, success, or error.
	 */
	handleFetchEvent(event, callback) {
		const { from } = this;
		const { id } = event.detail;
		if (this.from.includes(id)) {
			//console.debug('🎯 HyperTarget handling event', { from, id });
			callback();
		} else {
			//console.debug('🙉 HyperTarget ignoring event', { from, id });
		}
	}
}
