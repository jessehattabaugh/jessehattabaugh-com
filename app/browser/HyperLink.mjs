import { HyperFetch } from './HyperFetch.mjs';

/**
 * Wraps an anchor element to provide prefetching on mouseover and fetching on click.
 */
export class HyperLink extends HyperFetch {
	constructor() {
		super();
		this.handleEvent = this.handleEvent.bind(this);
	}

	connectedCallback() {
		super.connectedCallback();
		this.anchor = this.querySelector('a');
		if (this.anchor) {
			this.url = new URL(this.anchor.getAttribute('href'), document.baseURI);
			// console.debug('🔗 Anchor found', this.url);
			this.anchor.addEventListener('mouseover', this.handleEvent);
			this.anchor.addEventListener('click', this.handleEvent);
		}
	}

	disconnectedCallback() {
		if (this.anchor) {
			this.anchor.removeEventListener('mouseover', this.handleEvent);
			this.anchor.removeEventListener('click', this.handleEvent);
		}
		super.disconnectedCallback();
	}

	/**
	 * @param {Event} event
	 */
	async handleEvent(event) {
		const isPrefetch = event.type !== 'click';
		if (!isPrefetch) {
			event.preventDefault();
		}
		const { id, url, method } = this;
		const details = { id, url, method, isPrefetch };
		try {
			await this.fetch(url, {}, isPrefetch);
			// console.debug(`✅ HyperLink ${isPrefetch ? 'Prefetch' : 'Fetch'} successful`, details);
		} catch ({ message }) {
			console.error(message, details);
		}
	}
}
