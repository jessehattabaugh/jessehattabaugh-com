/**
 * Base class for handling fetch operations with custom elements.
 */
export class HyperFetch extends HTMLElement {
	/** @type {Map<string, import('./types').FetchDetails} */
	static fetchCache = new Map();

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
	 * @event hyper-fetch-loading - Triggered when the fetch operation is initiated.
	 * @event hyper-fetch-success - Triggered when the fetch operation is successful.
	 * @event hyper-fetch-error - Triggered when the fetch operation fails.
	 * @event hyper-fetch-end - Triggered when the fetch operation is completed.
	 */
	async fetch(url, options, isPrefetch = false) {
		/** @type {import('./types').FetchDetails} */
		const args = { id: this.id, isPrefetch, options, url };

		// console.debug('🌐 HyperFetch initiating fetch', args);
		const { signal } = this.controller;
		const eventSuffix = isPrefetch ? '-prefetch' : '';

		this.dispatchEvent(this.createEvent(`hyper-fetch-loading${eventSuffix}`, args));
		if (url) {
			try {
				const cached = HyperFetch.fetchCache.get(url.toString());
				if (cached) {
					this.dispatchEvent(
						this.createEvent(`hyper-fetch-success${eventSuffix}`, cached),
					);
					//console.debug('💰 HyperFetch cache fetch success', cached);
				} else {
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
						this.dispatchEvent(
							this.createEvent(`hyper-fetch-success${eventSuffix}`, details),
						);

						details.cached = true;
						HyperFetch.fetchCache.set(url.toString(), details);

						//console.debug('🐶 HyperFetch network fetch success', details);
					} else {
						throw new Error(`❌ HyperFetch fetch error`, { cause: response });
					}
				}
			} catch ({ message, cause }) {
				/** @type {import('./types').FetchDetails} */
				const details = { ...args, message, cause };
				this.dispatchEvent(this.createEvent(`hyper-fetch-error${eventSuffix}`, details));
				throw new Error(message, { cause });
			} finally {
				// console.debug('🔄 HyperFetch fetch completed', { ...args });
				this.dispatchEvent(this.createEvent(`hyper-fetch-end${eventSuffix}`, args));
			}
		} else {
			throw new Error('❓ No URL specified for fetch operation', args);
		}
	}
}
