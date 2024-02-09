import { HyperStatus } from './HyperStatus.mjs';
/**
 * A custom element that updates it's content based on the response of a fetch operation.
 */
export class HyperUpdate extends HyperStatus {
	constructor() {
		super();
		this.update = this.update.bind(this);
	}

	connectedCallback() {
		super.connectedCallback();
		this.id = this.getAttribute('id');
		this.record = this.getAttribute('record') || true;
		this.how = this.getAttribute('how') || 'replace';
		this.select = this.getAttribute('select') || `#${this.id}`;
		this.addEventListener('hyper-fetch-success', this.update);
	}

	disconnectedCallback() {
		this.removeEventListener('hyper-fetch-success', this.update);
		super.disconnectedCallback();
	}

	/**
	 * @param {CustomEvent<import('./types').FetchDetails>} event
	 */
	async update(event) {
		try {
			const { id, select } = this;
			const { detail } = event;
			const { data, url } = detail;

			// Parse the response and update the content
			const parser = new DOMParser();
			const doc = parser.parseFromString(data, 'text/html');
			const newContent = doc.querySelector(select);

			const cause = { data, doc, id, select, url };
			//console.debug('🔄 HyperUpdate update', cause, detail);

			if (newContent) {
				switch (this.how) {
					case 'append':
						await this.transitionView(() => {
							return this.appendChild(newContent);
						});
						break;
					case 'prepend':
						await this.transitionView(() => {
							this.insertBefore(newContent, this.firstChild);
						});
						break;
					case 'replace':
					default:
						await this.transitionView(() => {
							this.innerHTML = newContent.innerHTML;
						});
						break;
				}
			} else {
				throw new Error('🤬 HyperUpdate: no content matches the selector.', { cause });
			}
		} catch ({ message, cause }) {
			console.error(message, cause);
		}
	}

	/**
	 * @param {function} updateContent - A function that updates the content of the element.
	 */
	async transitionView(updateContent) {
		// Use the View Transitions API if available
		if ('documentTransition' in document) {
			try {
				await document.documentTransition.prepare();
				updateContent();
				await document.documentTransition.start();
			} catch (cause) {
				throw new Error('👹 HyperUpdate: Error transitioning view', { cause });
			}
		} else {
			// View Transitions API is not supported so update the content directly
			updateContent();
		}
	}
}
