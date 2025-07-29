import { test } from 'node:test';
import assert from 'node:assert';
import { html } from '../../../lib/html.js';

test('PWA Meta Tags in HTML', async (t) => {
	await t.test('should include manifest link in HTML output', async () => {
		const htmlOutput = html`<div>Test content</div>`;
		
		assert.ok(htmlOutput.includes('<link rel="manifest" href="/static/manifest.json">'));
		assert.ok(htmlOutput.includes('<meta name="theme-color" content="#2563eb">'));
	});
	
	await t.test('should include apple touch meta tags', async () => {
		const htmlOutput = html`<div>Test content</div>`;
		
		assert.ok(htmlOutput.includes('<meta name="apple-mobile-web-app-capable" content="yes">'));
		assert.ok(htmlOutput.includes('<meta name="apple-mobile-web-app-status-bar-style" content="default">'));
		assert.ok(htmlOutput.includes('<meta name="apple-mobile-web-app-title" content="Jesse H">'));
		assert.ok(htmlOutput.includes('<link rel="apple-touch-icon" href="/static/icons/icon-192x192.png">'));
	});
	
	await t.test('should include service worker registration script', async () => {
		const htmlOutput = html`<div>Test content</div>`;
		
		assert.ok(htmlOutput.includes("navigator.serviceWorker.register('/sw')"));
		assert.ok(htmlOutput.includes("'serviceWorker' in navigator"));
	});
	
	await t.test('should include description meta tag', async () => {
		const htmlOutput = html`<div>Test content</div>`;
		
		assert.ok(htmlOutput.includes('<meta name="description" content="Jesse Hattabaugh\'s personal website - Software developer passionate about creating amazing web experiences">'));
	});
});