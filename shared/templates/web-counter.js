import { html } from '../html.js';

/** @param {number} [views] @param {string | null} [leadingZeros] */
function counterFace(views, leadingZeros) {
	if (views === undefined) {
		return html`<span aria-hidden="true" data-reels><span data-empty></span></span>`;
	}
	const padding = leadingZeros && /^\d+$/.test(leadingZeros) && Number(leadingZeros) <= 16 ? Number(leadingZeros) : 1;
	const digits = '0'.repeat(padding) + views;
	const count = views.toLocaleString('en-US');
	return html`<span data-count>${count}</span><span aria-hidden="true" data-reels>${[...digits].map((digit, index) => {
		return html`<span style="--digit:${digit};--wheel:${index}"></span>`;
	})}</span>`;
}

/** @param {number} [views] @param {string | null} [leadingZeros] */
export function webCounter(views, leadingZeros) {
	return html`<web-counter${views === undefined ? html`` : html` value="${views}"`}${leadingZeros == null ? html`` : html` leading-zeros="${leadingZeros}"`}>
		<template shadowrootmode="open">
			<link rel="stylesheet" href="/components/web-counter/styles.css">
			<output aria-label="Page views">${counterFace(views, leadingZeros)}</output>
			<slot name="label">Page views</slot>
		</template>
		<output aria-label="Page views">${views?.toLocaleString('en-US') ?? ''}</output>
		<span slot="label">Page views · last 30 days</span>
	</web-counter>`;
}
