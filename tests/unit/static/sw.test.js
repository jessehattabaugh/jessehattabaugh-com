import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import path from 'node:path';

test('Service Worker File', async (t) => {
	const swPath = path.join(process.cwd(), 'static', 'sw.js');
	
	await t.test('should exist and be readable', async () => {
		const swContent = readFileSync(swPath, 'utf8');
		assert.ok(swContent.length > 0);
	});
	
	await t.test('should contain required PWA cache functionality', async () => {
		const swContent = readFileSync(swPath, 'utf8');
		
		// Check for required constants and events
		assert.ok(swContent.includes('CACHE_NAME'));
		assert.ok(swContent.includes('STATIC_CACHE_URLS'));
		assert.ok(swContent.includes("addEventListener('install'"));
		assert.ok(swContent.includes("addEventListener('activate'"));
		assert.ok(swContent.includes("addEventListener('fetch'"));
	});
	
	await t.test('should cache critical resources', async () => {
		const swContent = readFileSync(swPath, 'utf8');
		
		// Check that important pages and assets are cached
		assert.ok(swContent.includes("'/'"));
		assert.ok(swContent.includes("'/about'"));
		assert.ok(swContent.includes("'/hello'"));
		assert.ok(swContent.includes("'/static/styles/all.css'"));
	});
});