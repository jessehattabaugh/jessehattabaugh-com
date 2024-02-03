/** CustomEvent factory
 * @param {string} name
 * @param {*} detail
 */
function createCustomEvent(name, detail) {
	return new CustomEvent(name, { bubbles: true, composed: true, detail });
}

export const HXFetch = class extends HTMLElement {
	constructor() {
		super();
		this.child = this.firstElementChild;
		this.handleEvent = this.handleEvent.bind(this);
		// console.debug('🚀 HXFetch constructed');
	}

	connectedCallback() {
		if (this.child.tagName === 'FORM' && this.child.hasAttribute('action')) {
			this.child.addEventListener('submit', this.handleEvent);
			console.debug('📝 HXFetch submit event listener added for form');
		} else if (this.child.tagName === 'A' && this.child.hasAttribute('href')) {
			this.child.addEventListener('click', this.handleEvent);
			console.debug('🔗 HXFetch click event listener added for anchor');
		}
	}

	disconnectedCallback() {
		this.child.removeEventListener('submit', this.handleEvent);
		this.child.removeEventListener('click', this.handleEvent);
		console.debug('🧹 HXFetch event listeners removed');
	}

	/**
	 * @param {{ preventDefault: () => void; }} event
	 */
	handleEvent(event) {
		event.preventDefault();

		const id = this.getAttribute('id');
		const method = this.getAttribute('method').toUpperCase() || 'GET';

		const action = this.child.getAttribute('action');
		const href = this.child.getAttribute('href');

		if (action && this.child instanceof HTMLFormElement) {
			console.debug('📤 HXFetch handling submit for form', { id, method, action });
			this.handleFetch(id, method, action, new FormData(this.child));
		} else if (href && this.child instanceof HTMLAnchorElement) {
			console.debug('🖱️ HXFetch handling click for anchor', { id, method, href });
			this.handleFetch(id, method, href);
		}
	}

	/**
	 * @param {string | null} id
	 * @param {string} method
	 * @param {string | URL | Request} url
	 * @param {FormData | null} formData
	 */
	async handleFetch(id = null, method = 'GET', url, formData = null) {
		const args = { id, method, url, formData };
		console.debug('🌐 HXFetch initiating fetch', { ...args, formData });
		this.dispatchEvent(createCustomEvent('hx-fetch-start', { ...args, formData }));

		/** @type {HeadersInit} */
		const headers = { Accept: 'application/json' };
		/** @todo allow for other headers */

		/** @type {RequestInit} */
		const fetchOptions = { method, headers };

		if (method === 'POST' && formData) {
			fetchOptions.body = formData;
			headers['Content-Type'] = 'application/x-www-form-urlencoded';
		}

		try {
			const response = await fetch(url, fetchOptions);
			const { ok, status } = response;
			if (ok) {
				const data = await response.json();
				console.debug('✅ HXFetch fetch success', { ...args, status, data });
				this.dispatchEvent(
					createCustomEvent('hx-fetch-success', { ...args, status, data }),
				);
				/*const locationUrl = response.headers.get('Location');
				if (locationUrl) {
					window.location.href = locationUrl; // Redirect to the URL provided in the Location header
				} else if (['DELETE', 'PUT'].includes(method)) {
					window.location.reload(); // If no Location header, simply reload the current page
				}
				/** @todo allow users to cancel reload/redirect */
			} else {
				throw new Error(`Network response status was ${status}.`);
			}
		} catch (error) {
			console.error('❌ HXFetch fetch error', { ...args, error });
			this.dispatchEvent(createCustomEvent('hx-fetch-error', { ...args, error }));
		} finally {
			console.debug('🔄 HXFetch fetch completed', { ...args });
			this.dispatchEvent(createCustomEvent('hx-fetch-end', { ...args }));
		}
	}
};

/**
 * HXFetchStatus custom element to show status indicators for fetch operations.
 */
export class HXFetchStatus extends HTMLElement {
	constructor() {
		super();
		this.handleFetchStart = this.handleFetchStart.bind(this);
		this.handleFetchSuccess = this.handleFetchSuccess.bind(this);
		this.handleFetchError = this.handleFetchError.bind(this);
		this.handleFetchEnd = this.handleFetchEnd.bind(this);
		// console.debug('🛠️ HXFetchStatus constructed');
	}

	connectedCallback() {
		this.targets = (this.getAttribute('data-hx-targets') || '').split(',').map((id) => {
			return id.trim();
		});
		document.addEventListener('hx-fetch-start', this.handleFetchStart);
		document.addEventListener('hx-fetch-success', this.handleFetchSuccess);
		document.addEventListener('hx-fetch-error', this.handleFetchError);
		document.addEventListener('hx-fetch-end', this.handleFetchEnd);
		console.debug('🔗 HXFetchStatus event listeners added', { targets: this.targets });
	}

	disconnectedCallback() {
		document.removeEventListener('hx-fetch-start', this.handleFetchStart);
		document.removeEventListener('hx-fetch-success', this.handleFetchSuccess);
		document.removeEventListener('hx-fetch-error', this.handleFetchError);
		document.removeEventListener('hx-fetch-end', this.handleFetchEnd);
		console.debug('🧹 HXFetchStatus event listeners removed', {});
	}

	/**
	 * Handles the start of a fetch operation.
	 * @param {CustomEvent} event - The event triggered on fetch start.
	 */
	handleFetchStart(event) {
		const { id } = event.detail;
		console.debug('⏳ HXFetchStatus handling fetch start', { id });
		this.updateVisibility(id, 'loading');
	}

	/**
	 * Handles the successful completion of a fetch operation.
	 * @param {CustomEvent} event - The event triggered on fetch success.
	 */
	handleFetchSuccess(event) {
		const { id } = event.detail;
		console.debug('✅ HXFetchStatus handling fetch success', { id });
		this.updateVisibility(id, 'success');
	}

	/**
	 * Handles an error in a fetch operation.
	 * @param {CustomEvent} event - The event triggered on fetch error.
	 */
	handleFetchError(event) {
		const { id } = event.detail;
		console.debug('❌ HXFetchStatus handling fetch error', { id });
		this.updateVisibility(id, 'error');
	}

	/**
	 * Handles the end of a fetch operation. This might be optional depending on whether specific actions are needed on fetch end.
	 * @param {CustomEvent} event - The event triggered on fetch end.
	 */
	handleFetchEnd(event) {
		const { id } = event.detail;
		console.debug('🏁 HXFetchStatus handling fetch end', { id });
	}

	/**
	 * Updates the visibility of slots based on the current status.
	 * @param {string} id - The identifier of the HXFetch element.
	 * @param {string} status - The current fetch status.
	 */
	updateVisibility(id, status) {
		if (this.targets.length === 0 || this.targets.includes(id)) {
			this.hideAllSlots();
			/** @type {HTMLElement | null} */
			const slot = this.querySelector(`[slot="${status}"]`);
			if (slot) {
				slot.style.display = '';
			}
			console.debug('🔄 HXFetchStatus updating visibility', { id, status });
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
		console.debug('🙈 HXFetchStatus hiding all slots', {});
	}
}
