import { test } from 'node:test';
import assert from 'node:assert';
import { get } from '../../../pages/sw.js';

test('Service Worker Page Handler', async (t) => {
	await t.test('should return valid JavaScript content', async () => {
		const result = await get();
		
		assert.strictEqual(result.statusCode, 200);
		assert.strictEqual(result.headers['Content-Type'], 'application/javascript');
		assert.strictEqual(result.headers['Cache-Control'], 'public, max-age=3600');
		
		const swContent = result.body;
		assert.ok(swContent.length > 0);
	});
	
	await t.test('should contain required PWA cache functionality', async () => {
		const result = await get();
		const swContent = result.body;
		
		// Check for required constants and events
		assert.ok(swContent.includes('CACHE_NAME'));
		assert.ok(swContent.includes('STATIC_CACHE_URLS'));
		assert.ok(swContent.includes("addEventListener('install'"));
		assert.ok(swContent.includes("addEventListener('activate'"));
		assert.ok(swContent.includes("addEventListener('fetch'"));
	});
	
	await t.test('should cache critical resources', async () => {
		const result = await get();
		const swContent = result.body;
		
		// Check that important pages and assets are cached
		assert.ok(swContent.includes("'/'"));
		assert.ok(swContent.includes("'/about'"));
		assert.ok(swContent.includes("'/hello'"));
		assert.ok(swContent.includes("'/static/styles/all.css'"));
	});
});