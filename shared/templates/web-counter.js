import { html } from '../html.js';

/** @param {number} [views] */
export function counterFace(views) {
	if (views === undefined) {
		return html`<span aria-hidden="true" data-reels><span data-empty></span></span>`;
	}
	const digits = String(views);
	// Parcel's embedded runtime may not load locale data during static rendering.
	const count = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	return html`<span data-count>${count}</span><span aria-hidden="true" data-reels>${[...digits.padStart(6, '0')].map((digit, index) => {
		return html`<span style="--digit:${digit};--wheel:${index}"></span>`;
	})}</span>`;
}

/** @param {number} [views] */
export function webCounter(views) {
	return html`<web-counter${views === undefined ? html`` : html` value="${views}"`}>
		<output aria-label="Site page views">${counterFace(views)}</output>
		<span>Page views · last 30 days</span>
	</web-counter>`;
}
