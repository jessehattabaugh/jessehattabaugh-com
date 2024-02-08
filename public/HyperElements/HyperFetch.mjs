/**
 * Base class for handling fetch operations with custom elements.
 */
export class HyperFetch extends HTMLElement {
	constructor() {
		super();
		this.fetch = this.fetch.bind(this);
		this.controller = new AbortController();
		this.url = new URL(document.location.href);
	}

	connectedCallback() {
		this.id = this.getAttribute('id');
		this.method = this.getAttribute('method')?.toUpperCase() || 'GET'; // Default to 'GET' if not specified
	}

	disconnectedCallback() {
		this.controller.abort(); // Abort any ongoing fetch requests
	}

	/** CustomEvent factory
	 * @param {string} name
	 * @param {import('./types').FetchDetails} detail
	 */
	createEvent(name, detail = {}) {
		return new CustomEvent(name, {
			detail: { ...detail, id: this.id }, // Include the 'id' in every event detail
			bubbles: true,
			composed: true,
		});
	}

	/**
	 * Performs a fetch request and dispatches custom events based on the response.
	 * @param {URL} url
	 * @param {RequestInit} [options]
	 * @param {boolean} [isPrefetch] - Indicates if the fetch is a prefetch.
	 * @event hyper-fetch-start - Triggered when the fetch operation is initiated.
	 * @event hyper-fetch-success - Triggered when the fetch operation is successful.
	 * @event hyper-fetch-error - Triggered when the fetch operation fails.
	 * @event hyper-fetch-end - Triggered when the fetch operation is completed.
	 */
	async fetch(url, options, isPrefetch = false) {
		/** @type {import('./types').FetchDetails} */
		const args = { id: this.id, isPrefetch, options, url };

		// console.debug('🌐 HXFetch initiating fetch', args);
		const { signal } = this.controller;
		const eventSuffix = isPrefetch ? '-prefetch' : '';
		if (url) {
			this.dispatchEvent(this.createEvent(`hyper-fetch-start${eventSuffix}`, args));
			try {
				const response = await fetch(url, { ...options, signal, method: this.method });
				const { ok, status } = response;
				if (ok) {
					// Check the content type to handle the response appropriately
					const contentType = response.headers.get('Content-Type');
					const data = contentType.includes('application/json')
						? await response.json()
						: await response.text();
					/** @type {import('./types').FetchDetails} */
					const details = { ...args, contentType, data, response, status };
					// console.debug('✅ HXFetch fetch success', details);
					this.dispatchEvent(
						this.createEvent(`hyper-fetch-success${eventSuffix}`, details),
					);
				} else {
					throw new Error(`❌ HXFetch fetch error`, { cause: response });
				}
			} catch ({ message, cause }) {
				/** @type {import('./types').FetchDetails} */
				const details = { ...args, error: message };
				console.error(message, details);
				this.dispatchEvent(this.createEvent(`hyper-fetch-error${eventSuffix}`, details));
			} finally {
				// console.debug('🔄 HXFetch fetch completed', { ...args });
				this.dispatchEvent(this.createEvent(`hyper-fetch-end${eventSuffix}`, args));
			}
		} else {
			throw new Error('❓ No URL specified for fetch operation', args);
		}
	}
}
