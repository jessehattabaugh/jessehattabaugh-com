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
	 * @param {*} detail
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
	 */
	async fetch(url, options, isPrefetch = false) {
		const args = { id: this.id, url, options, isPrefetch };
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
					const details = { ...args, status, data };
					// console.debug('✅ HXFetch fetch success', details);
					this.dispatchEvent(
						this.createEvent(`hyper-fetch-success${eventSuffix}`, details),
					);
				} else {
					throw new Error(`❌ HXFetch fetch error`, { cause: response });
				}
			} catch ({ message, cause }) {
				console.error(message, { ...args, cause });
				this.dispatchEvent(
					this.createEvent(`hyper-fetch-error${eventSuffix}`, { ...args, message }),
				);
			} finally {
				// console.debug('🔄 HXFetch fetch completed', { ...args });
				this.dispatchEvent(this.createEvent(`hyper-fetch-end${eventSuffix}`, { ...args }));
			}
		} else {
			throw new Error('❌ No URL specified for fetch operation');
		}
	}
}
