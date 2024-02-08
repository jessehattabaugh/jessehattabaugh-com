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
		const { id, url, method } = this;
		const isClick = event.type === 'click';
		if (isClick) {
			event.preventDefault();
		}

		// fetch onclick or prefetch on mouseover but only if the method is GET
		if (isClick || (!isClick && method === 'GET')) {
			const details = { id, url, method, isClick };
			try {
				await this.fetch(url, {}, !isClick);
				// console.debug(`✅ HyperLink ${isPrefetch ? 'Prefetch' : 'Fetch'} successful`, details);
			} catch ({ message }) {
				console.error(message, details);
			}
		}
	}
}
