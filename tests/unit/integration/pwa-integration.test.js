import { test } from 'node:test';
import assert from 'node:assert';
import { get as getManifest } from '../../../pages/manifest.js';
import { html } from '../../../lib/html.js';

test('PWA Integration', async (t) => {
	await t.test('should serve valid PWA manifest from root path', async () => {
		const manifestResponse = await getManifest();
		
		// Verify response structure
		assert.strictEqual(manifestResponse.statusCode, 200);
		assert.strictEqual(manifestResponse.headers['Content-Type'], 'application/manifest+json');
		
		// Verify manifest content
		const manifest = JSON.parse(manifestResponse.body);
		assert.strictEqual(manifest.name, 'Jesse Hattabaugh');
		assert.strictEqual(manifest.start_url, '/');
		assert.strictEqual(manifest.display, 'standalone');
		assert.ok(Array.isArray(manifest.icons));
		assert.strictEqual(manifest.icons.length, 2);
	});
	
	await t.test('should include manifest link in all HTML pages', async () => {
		const htmlOutput = html`<div>Sample page content</div>`;
		
		// Check that HTML includes proper manifest reference
		assert.ok(htmlOutput.includes('<link rel="manifest" href="/manifest">'));
		assert.ok(htmlOutput.includes('<meta name="theme-color" content="#2563eb">'));
	});
	
	await t.test('should have consistent icon paths between manifest and HTML', async () => {
		const manifestResponse = await getManifest();
		const manifest = JSON.parse(manifestResponse.body);
		const htmlOutput = html`<div>Sample page content</div>`;
		
		// Verify icon paths are consistent
		const manifestIconPath = manifest.icons[0].src;
		assert.ok(htmlOutput.includes(`href="${manifestIconPath}"`));
		assert.strictEqual(manifestIconPath, '/static/icons/icon-192x192.png');
	});
	
	await t.test('should have all required PWA components', async () => {
		// Check that all PWA files exist conceptually
		const manifestResponse = await getManifest();
		const htmlOutput = html`<div>Sample page content</div>`;
		
		// 1. Web App Manifest - served from Lambda
		assert.strictEqual(manifestResponse.statusCode, 200);
		assert.ok(JSON.parse(manifestResponse.body).name);
		
		// 2. Service Worker registration in HTML
		assert.ok(htmlOutput.includes("navigator.serviceWorker.register('/static/sw.js')"));
		
		// 3. Apple Touch Meta Tags for iOS
		assert.ok(htmlOutput.includes('apple-mobile-web-app'));
		
		// 4. Theme color for browser UI
		assert.ok(htmlOutput.includes('theme-color'));
	});
});