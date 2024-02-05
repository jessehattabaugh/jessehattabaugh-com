/**
 * HXStatus custom element to show status indicators for fetch operations.
 */
export class HXStatus extends HTMLElement {
	constructor() {
		super();
		this.handleFetchStart = this.handleFetchStart.bind(this);
		this.handleFetchSuccess = this.handleFetchSuccess.bind(this);
		this.handleFetchError = this.handleFetchError.bind(this);
		//this.handleFetchEnd = this.handleFetchEnd.bind(this);
		// console.debug('🛠️ HXStatus constructed');
	}

	connectedCallback() {
		this.targets = (this.getAttribute('data-hx-targets') || '').split(',').map((id) => {
			return id.trim();
		});
		document.addEventListener('hx-fetch-start', this.handleFetchStart);
		document.addEventListener('hx-fetch-success', this.handleFetchSuccess);
		document.addEventListener('hx-fetch-error', this.handleFetchError);
		//document.addEventListener('hx-fetch-end', this.handleFetchEnd);
		//console.debug('🔗 HXStatus event listeners added', { targets: this.targets });
	}

	disconnectedCallback() {
		document.removeEventListener('hx-fetch-start', this.handleFetchStart);
		document.removeEventListener('hx-fetch-success', this.handleFetchSuccess);
		document.removeEventListener('hx-fetch-error', this.handleFetchError);
		//document.removeEventListener('hx-fetch-end', this.handleFetchEnd);
		//console.debug('🧹 HXStatus event listeners removed', {});
	}

	/**
	 * Handles the start of a fetch operation.
	 * @param {CustomEvent} event - The event triggered on fetch start.
	 */
	handleFetchStart(event) {
		const { id } = event.detail;
		if (this.targets.includes(id)) {
			console.debug('⏳ HXStatus handling fetch start', { id });
			this.updateVisibility(id, 'loading');
		}
	}

	/**
	 * Handles the successful completion of a fetch operation.
	 * @param {CustomEvent} event - The event triggered on fetch success.
	 */
	handleFetchSuccess(event) {
		const { id } = event.detail;
		if (this.targets.includes(id)) {
			console.debug('✅ HXStatus handling fetch success', { id });
			this.updateVisibility(id, 'success');
		}
	}

	/**
	 * Handles an error in a fetch operation.
	 * @param {CustomEvent} event - The event triggered on fetch error.
	 */
	handleFetchError(event) {
		const { id } = event.detail;
		if (this.targets.includes(id)) {
			console.debug('⛔ HXStatus handling fetch error', { id });
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
			console.debug('🏁 HXStatus handling fetch end', { id });
		}
	}*/

	/**
	 * Updates the visibility of slots based on the current status.
	 * @param {string} id - The identifier of the HXFetch element.
	 * @param {string} status - The current fetch status.
	 */
	updateVisibility(id, status) {
		if (this.targets.includes(id)) {
			this.hideAllSlots();
			/** @type {HTMLElement | null} */
			const slot = this.querySelector(`[slot="${status}"]`);
			if (slot) {
				slot.style.display = 'revert';
			}
			console.debug('🔄 HXStatus updating visibility', { id, status });
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
		console.debug('🙈 HXStatus hiding all slots', {});
	}
}
