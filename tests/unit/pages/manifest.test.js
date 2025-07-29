import { test } from 'node:test';
import assert from 'node:assert';
import { get } from '../../../pages/manifest.js';

test('Manifest handler functionality', async (t) => {
	await t.test('should return valid manifest JSON', async () => {
		const result = await get();
		
		assert.strictEqual(result.statusCode, 200);
		assert.strictEqual(result.headers['Content-Type'], 'application/manifest+json');
		assert.strictEqual(result.headers['Cache-Control'], 'public, max-age=3600');
		
		const manifest = JSON.parse(result.body);
		assert.strictEqual(manifest.name, 'Jesse Hattabaugh');
		assert.strictEqual(manifest.short_name, 'Jesse H');
		assert.strictEqual(manifest.start_url, '/');
		assert.strictEqual(manifest.display, 'standalone');
		assert.strictEqual(manifest.theme_color, '#2563eb');
		assert.strictEqual(manifest.background_color, '#ffffff');
		
		// Verify icons array
		assert.ok(Array.isArray(manifest.icons));
		assert.strictEqual(manifest.icons.length, 2);
		
		const icon192 = manifest.icons.find(icon => icon.sizes === '192x192');
		const icon512 = manifest.icons.find(icon => icon.sizes === '512x512');
		
		assert.ok(icon192);
		assert.ok(icon512);
		assert.strictEqual(icon192.src, '/static/icons/icon-192x192.png');
		assert.strictEqual(icon512.src, '/static/icons/icon-512x512.png');
	});
	
	await t.test('should have proper PWA manifest structure', async () => {
		const result = await get();
		const manifest = JSON.parse(result.body);
		
		// Check required PWA manifest fields
		assert.ok(manifest.name);
		assert.ok(manifest.start_url);
		assert.ok(manifest.display);
		assert.ok(manifest.icons);
		
		// Check optional but recommended fields
		assert.ok(manifest.description);
		assert.ok(manifest.theme_color);
		assert.ok(manifest.background_color);
		assert.ok(manifest.lang);
		assert.ok(manifest.scope);
	});
});