/**
 * HyperStatus custom element to show status indicators for fetch operations.
 */
export class HyperStatus extends HTMLElement {
	constructor() {
		super();
		this.toggleStatusSlots = this.toggleStatusSlots.bind(this);
		// console.debug('🛠️ HyperStatus constructed');
	}

	connectedCallback() {
		this.for = (this.getAttribute('for') || '').split(',').map((id) => {
			return id.trim();
		});
		document.addEventListener('hyper-fetch-start', this.toggleStatusSlots);
		document.addEventListener('hyper-fetch-success', this.toggleStatusSlots);
		document.addEventListener('hyper-fetch-error', this.toggleStatusSlots);
		//console.debug('🔗 HyperStatus event listeners added', { for: this.for });
	}

	disconnectedCallback() {
		document.removeEventListener('hyper-fetch-start', this.toggleStatusSlots);
		document.removeEventListener('hyper-fetch-success', this.toggleStatusSlots);
		document.removeEventListener('hyper-fetch-error', this.toggleStatusSlots);
		//console.debug('🧹 HyperStatus event listeners removed', {});
	}

	/** Toggles slot visibility based on the event type and the id of the fetch operation.
	 * @param {CustomEvent<import('../../types').FetchDetails>} event - The event triggered on fetch start, success, or error.
	 */
	toggleStatusSlots(event) {
		const { id } = event.detail;
		if (this.for.includes(id)) {
			// get the type of event
			const [, , type] = event.type.split('-');
			//console.debug('⌛ HyperStatus handling event', { id, type });

			// hide all status slots
			['loading', 'success', 'error'].forEach((status) => {
				/** @type {HTMLElement | null} */
				const slot = this.querySelector(`[slot="${status}"]`);
				if (slot) {
					slot.style.display = 'none';
					//console.debug('🙈 HyperStatus hid', { id, type });
				}
			});

			// update slots
			/** @type {HTMLElement | null} */
			const slot = this.querySelector(`[slot="${type}"]`);
			if (slot) {
				slot.style.display = 'revert';
				//console.debug('🔊 HyperStatus showed', { id, type });
			} else {
				//console.debug('🤷 HyperStatus no slot for type', { id, type });
			}
		}
	}
}
