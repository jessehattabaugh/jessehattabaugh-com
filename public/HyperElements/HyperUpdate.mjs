import { HyperTarget } from './HyperTarget.mjs';
/**
 * A custom element that updates it's content based on the response of a fetch operation.
 */
export class HyperUpdate extends HyperTarget {
	constructor() {
		super();
	}

	connectedCallback() {
		super.connectedCallback();
		this.id = this.getAttribute('id');

		// the selector to update when fetch is recieved
		this.select = this.getAttribute('select') || `#${this.id}`;
	}

	disconnectedCallback() {
		super.disconnectedCallback();
	}

	/**
	 * @param {CustomEvent<import('./types').FetchDetails>} event
	 */
	async handleFetchEvent(event) {
		super.handleFetchEvent(event, async () => {
			const { type, detail } = event;
			if (type === 'hyper-fetch-success') {
				await this.update(detail);
				/** @todo push state to the History API and update the url */
			}
		});
	}

	/**
	 * @param {import('./types').FetchDetails} event
	 */
	async update(detail) {
		try {
			const { id, select } = this;
			const { data, url } = detail;

			// parse the data and select the content to update
			const parser = new DOMParser();
			const doc = parser.parseFromString(data, 'text/html');
			/** @todo handle JSON responses somehow */
			const newContent = doc.querySelector(select);

			const cause = { data, doc, id, select, url };

			if (newContent) {
				await this.transitionView(() => {
					this.innerHTML = newContent.innerHTML;
				});
				//console.debug('🔄 HyperUpdate update', cause, detail);
				/** @todo allow content to be appended and prepended */
			} else {
				throw new Error('🤬 HyperUpdate: no content matches the selector.', { cause });
			}
		} catch ({ message, cause }) {
			console.error(message, cause);
		}
	}

	/** updates the content of the element with a View Transition if available
	 * @see https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API
	 * @param {function} updateContent - A function that updates the content of the element.
	 */
	async transitionView(updateContent) {
		if ('startViewTransition' in document) {
			document.startViewTransition(updateContent);
			//console.debug('🦜 HyperUpdate: View transition complete');
		} else {
			// View Transitions API is not supported so update the content directly
			updateContent();
			console.warn('🦆 HyperUpdate: content updated without View Transition');
		}
	}
}
