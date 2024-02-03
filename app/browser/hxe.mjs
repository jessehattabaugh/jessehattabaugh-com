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
		this.handleSubmit = this.handleSubmit.bind(this.child);
		this.handleClick = this.handleClick.bind(this.child);
		console.debug('🚀 HXFetch constructed');
	}

	connectedCallback() {
		if (this.child.tagName === 'FORM' && this.child.hasAttribute('action')) {
			this.child.addEventListener('submit', this.handleSubmit);
			console.debug('📝 HXFetch submit event listener added for form');
		} else if (this.child.tagName === 'A' && this.child.hasAttribute('href')) {
			this.child.addEventListener('click', this.handleClick);
			console.debug('🔗 HXFetch click event listener added for anchor');
		}
	}

	disconnectedCallback() {
		this.child.removeEventListener('submit', this.handleSubmit);
		this.child.removeEventListener('click', this.handleClick);
		console.debug('🧹 HXFetch event listeners removed');
	}

	/**
	 * @param {{ preventDefault: () => void; }} event
	 */
	handleSubmit(event) {
		event.preventDefault();
		const action = this.getAttribute('action');
		const method = this.getAttribute('method').toUpperCase() || 'GET';
		console.debug('📤 HXFetch handling submit for form', { action, method });
		if (this.child instanceof HTMLFormElement) {
			this.handleFetch(action, new FormData(this.child), method);
		} else {
			console.error('❌ HXFetch child is not a form', typeof this.child);
		}
	}

	/**
	 * @param {{ preventDefault: () => void; }} event
	 */
	handleClick(event) {
		event.preventDefault();
		const href = this.getAttribute('href');
		console.debug('🖱️ HXFetch handling click for anchor', { href });
		this.handleFetch(href);
	}

	/**
	 * @param {string | URL | Request} url
	 * @param {FormData | null} formData
	 * @param {string} method
	 */
	async handleFetch(url, formData = null, method = 'GET') {
		console.debug('🌐 HXFetch initiating fetch', { url, method, formData });
		this.dispatchEvent(createCustomEvent('hx-fetch-start'));

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
				console.debug('✅ HXFetch fetch success', { url, status, data });
				const detail = { data };
				this.dispatchEvent(createCustomEvent('hx-fetch-success', detail));
				const locationUrl = response.headers.get('Location');
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
			console.error('❌ HXFetch fetch error', { url, error });
			const detail = { error };
			this.dispatchEvent(createCustomEvent('hx-fetch-error', detail));
		} finally {
			console.debug('🔄 HXFetch fetch completed', { url });
			this.dispatchEvent(createCustomEvent('hx-fetch-end'));
		}
	}
};
