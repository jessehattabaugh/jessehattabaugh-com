import { test } from 'node:test';
import assert from 'node:assert';
import { get as getServiceWorker } from '../../../pages/sw.js';
import { html } from '../../../lib/html.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';

test('PWA Integration', async (t) => {
	await t.test('should serve static PWA manifest from /static directory', async () => {
		const manifestPath = path.join(process.cwd(), 'static', 'manifest.json');
		const manifestContent = readFileSync(manifestPath, 'utf8');
		const manifest = JSON.parse(manifestContent);
		
		// Verify manifest content
		assert.strictEqual(manifest.name, 'Jesse Hattabaugh');
		assert.strictEqual(manifest.start_url, '/');
		assert.strictEqual(manifest.display, 'standalone');
		assert.ok(Array.isArray(manifest.icons));
		assert.strictEqual(manifest.icons.length, 2);
	});
	
	await t.test('should serve service worker from root path via page handler', async () => {
		const swResponse = await getServiceWorker();
		
		// Verify response structure
		assert.strictEqual(swResponse.statusCode, 200);
		assert.strictEqual(swResponse.headers['Content-Type'], 'application/javascript');
		
		// Verify service worker content
		const swContent = swResponse.body;
		assert.ok(swContent.includes('CACHE_NAME'));
		assert.ok(swContent.includes("addEventListener('install'"));
	});
	
	await t.test('should include correct manifest link in all HTML pages', async () => {
		const htmlOutput = html`<div>Sample page content</div>`;
		
		// Check that HTML includes proper manifest reference to static file
		assert.ok(htmlOutput.includes('<link rel="manifest" href="/static/manifest.json">'));
		assert.ok(htmlOutput.includes('<meta name="theme-color" content="#2563eb">'));
	});
	
	await t.test('should have consistent icon paths between manifest and HTML', async () => {
		const manifestPath = path.join(process.cwd(), 'static', 'manifest.json');
		const manifestContent = readFileSync(manifestPath, 'utf8');
		const manifest = JSON.parse(manifestContent);
		const htmlOutput = html`<div>Sample page content</div>`;
		
		// Verify icon paths are consistent
		const manifestIconPath = manifest.icons[0].src;
		assert.ok(htmlOutput.includes(`href="${manifestIconPath}"`));
		assert.strictEqual(manifestIconPath, '/static/icons/icon-192x192.png');
	});
	
	await t.test('should have all required PWA components', async () => {
		// Check that all PWA files exist conceptually
		const manifestPath = path.join(process.cwd(), 'static', 'manifest.json');
		const manifestContent = readFileSync(manifestPath, 'utf8');
		const manifest = JSON.parse(manifestContent);
		const swResponse = await getServiceWorker();
		const htmlOutput = html`<div>Sample page content</div>`;
		
		// 1. Web App Manifest - served as static file
		assert.ok(manifest.name);
		
		// 2. Service Worker - served via Lambda at root path
		assert.strictEqual(swResponse.statusCode, 200);
		assert.ok(swResponse.body.includes('CACHE_NAME'));
		
		// 3. Service Worker registration in HTML pointing to root
		assert.ok(htmlOutput.includes("navigator.serviceWorker.register('/sw')"));
		
		// 4. Apple Touch Meta Tags for iOS
		assert.ok(htmlOutput.includes('apple-mobile-web-app'));
		
		// 5. Theme color for browser UI
		assert.ok(htmlOutput.includes('theme-color'));
	});
});