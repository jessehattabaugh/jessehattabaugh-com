import { HyperFetch } from './HyperFetch.mjs';

export class HyperForm extends HyperFetch {
	constructor() {
		super();
		this.handleEvent = this.handleEvent.bind(this);
	}

	connectedCallback() {
		super.connectedCallback();
		this.form = this.querySelector('form');
		if (this.form) {
			this.url = new URL(this.form.getAttribute('action'), document.baseURI);
			//console.debug('📝 HyperForm found', this.url);
			this.form.addEventListener('submit', this.handleEvent);
		}
	}

	disconnectedCallback() {
		if (this.form) {
			this.form.removeEventListener('submit', this.handleEvent);
		}
		super.disconnectedCallback();
	}

	/**
	 * @param {Event} event
	 */
	async handleEvent(event) {
		event.preventDefault();
		const { url, method } = this;
		const formData = new FormData(this.form);
		const details = { url, method, formData };
		// console.debug(`📤 Submitting form`, details);
		try {
			if (method === 'GET') {
				const { searchParams } = url;
				// @ts-expect-error TS doesn't know the FormData is iterable
				const formParams = new URLSearchParams(formData);
				for (const [key, value] of searchParams) {
					formParams.set(key, value);
				}
				url.search = formParams.toString();
				await this.fetch(url);
			} else {
				await this.fetch(url, { body: formData });
			}
			// console.debug('✅ Form submitted successfully', details);
		} catch ({ message }) {
			console.error(message, details);
		}
	}
}
