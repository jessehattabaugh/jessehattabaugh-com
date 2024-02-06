/**
 * HyperStatus custom element to show status indicators for fetch operations.
 */
export class HyperStatus extends HTMLElement {
	constructor() {
		super();
		this.handleFetchStart = this.handleFetchStart.bind(this);
		this.handleFetchSuccess = this.handleFetchSuccess.bind(this);
		this.handleFetchError = this.handleFetchError.bind(this);
		//this.handleFetchEnd = this.handleFetchEnd.bind(this);
		// console.debug('🛠️ HyperStatus constructed');
	}

	connectedCallback() {
		this.for = (this.getAttribute('for') || '').split(',').map((id) => {
			return id.trim();
		});
		document.addEventListener('hyper-fetch-start', this.handleFetchStart);
		document.addEventListener('hyper-fetch-success', this.handleFetchSuccess);
		document.addEventListener('hyper-fetch-error', this.handleFetchError);
		//document.addEventListener('hyper-fetch-end', this.handleFetchEnd);
		//console.debug('🔗 HyperStatus event listeners added', { for: this.for });
	}

	disconnectedCallback() {
		document.removeEventListener('hyper-fetch-start', this.handleFetchStart);
		document.removeEventListener('hyper-fetch-success', this.handleFetchSuccess);
		document.removeEventListener('hyper-fetch-error', this.handleFetchError);
		//document.removeEventListener('hyper-fetch-end', this.handleFetchEnd);
		//console.debug('🧹 HyperStatus event listeners removed', {});
	}

	/**
	 * Handles the start of a fetch operation.
	 * @param {CustomEvent} event - The event triggered on fetch start.
	 */
	handleFetchStart(event) {
		const { id } = event.detail;
		if (this.for.includes(id)) {
			// console.debug('⏳ HyperStatus handling fetch start', { id });
			this.updateVisibility(id, 'loading');
		}
	}

	/**
	 * Handles the successful completion of a fetch operation.
	 * @param {CustomEvent} event - The event triggered on fetch success.
	 */
	handleFetchSuccess(event) {
		const { id } = event.detail;
		if (this.for.includes(id)) {
			// console.debug('✅ HyperStatus handling fetch success', { id });
			this.updateVisibility(id, 'success');
		}
	}

	/**
	 * Handles an error in a fetch operation.
	 * @param {CustomEvent} event - The event triggered on fetch error.
	 */
	handleFetchError(event) {
		const { id } = event.detail;
		if (this.for.includes(id)) {
			// console.debug('⛔ HyperStatus handling fetch error', { id });
			this.updateVisibility(id, 'error');
		}
	}

	/**
	 * Handles the end of a fetch operation. This might be optional depending on whether specific actions are needed on fetch end.
	 * @param {CustomEvent} event - The event triggered on fetch end.
	 *
	handleFetchEnd(event) {
		const { id } = event.detail;
		if (this.targets.includes(id)) {
			console.debug('🏁 HyperStatus handling fetch end', { id });
		}
	}*/

	/**
	 * Updates the visibility of slots based on the current status.
	 * @param {string} id - The identifier of the HXFetch element.
	 * @param {string} status - The current fetch status.
	 */
	updateVisibility(id, status) {
		if (this.for.includes(id)) {
			this.hideAllSlots();
			/** @type {HTMLElement | null} */
			const slot = this.querySelector(`[slot="${status}"]`);
			if (slot) {
				slot.style.display = 'revert';
			}
			// console.debug('🔄 HyperStatus updating visibility', { id, status });
		}
	}

	/**
	 * Hides all slot elements.
	 */
	hideAllSlots() {
		['loading', 'success', 'error'].forEach((status) => {
			/** @type {HTMLElement | null} */
			const slot = this.querySelector(`[slot="${status}"]`);
			if (slot) {
				slot.style.display = 'none';
			}
		});
		// console.debug('🙈 HyperStatus hiding all slots', {});
	}
}
