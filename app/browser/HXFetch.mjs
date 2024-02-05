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
			//console.debug('📝 HXFetch submit event listener added for form');
		} else if (this.child.tagName === 'A' && this.child.hasAttribute('href')) {
			this.child.addEventListener('click', this.handleEvent);
			//console.debug('🔗 HXFetch click event listener added for anchor');
		}
	}

	disconnectedCallback() {
		this.child.removeEventListener('submit', this.handleEvent);
		this.child.removeEventListener('click', this.handleEvent);
		//console.debug('🧹 HXFetch event listeners removed');
	}

	/**
	 * @param {{ preventDefault: () => void; }} event
	 */
	handleEvent(event) {
		event.preventDefault();

		const id = this.getAttribute('id');
		const method = this.getAttribute('method')?.toUpperCase() || 'GET';

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
	 * @param {string} url
	 * @param {FormData | null} formData
	 */
	async handleFetch(id = null, method, url, formData = null) {
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
		} else if (formData) {
			// add the form data to the query string
			const query = new URLSearchParams(new URL(url, document.baseURI).search);
			// @ts-expect-error formData is iterable
			const data = Array.from(formData.entries());
			console.debug('🥗', { data, query, url });
			for (const [key, value] of data) {
				query.set(key, value);
			}
			url = `${url.split('?')[0]}?${query.toString()}`;
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
				throw new Error(`❌ HXFetch fetch error`, { cause: response });
			}
		} catch ({ message, cause }) {
			const { status } = cause;
			const data = await cause.json();
			console.error(message, { ...args, status, data });
			this.dispatchEvent(createCustomEvent('hx-fetch-error', { ...args, message }));
		} finally {
			console.debug('🔄 HXFetch fetch completed', { ...args });
			this.dispatchEvent(createCustomEvent('hx-fetch-end', { ...args }));
		}
	}
};
