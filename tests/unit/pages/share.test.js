import { describe, it } from 'node:test';
import assert from 'node:assert';

/**
 * Tests for the share submission page
 */
describe('Share page functionality', () => {
	it('should export get handler function', async () => {
		const shareModule = await import('../../../pages/share.js');
		assert.strictEqual(typeof shareModule.get, 'function');
	});

	it('should export post handler function', async () => {
		const shareModule = await import('../../../pages/share.js');
		assert.strictEqual(typeof shareModule.post, 'function');
	});

	it('should render share form HTML', async () => {
		const shareModule = await import('../../../pages/share.js');
		const result = await shareModule.get();
		
		assert.strictEqual(typeof result, 'string');
		assert.ok(result.includes('<!DOCTYPE html>'));
		assert.ok(result.includes('Share Something'));
		assert.ok(result.includes('shareForm'));
		assert.ok(result.includes('type="email"'));
		assert.ok(result.includes('type="text"'));
		assert.ok(result.includes('textarea'));
		assert.ok(result.includes('type="file"'));
	});

	it('should include form validation in HTML', async () => {
		const shareModule = await import('../../../pages/share.js');
		const result = await shareModule.get();
		
		assert.ok(result.includes('required'));
		assert.ok(result.includes('placeholder'));
		assert.ok(result.includes('accept="image/*"'));
	});

	it('should include JavaScript for form submission', async () => {
		const shareModule = await import('../../../pages/share.js');
		const result = await shareModule.get();
		
		assert.ok(result.includes('<script>'));
		assert.ok(result.includes('addEventListener'));
		assert.ok(result.includes('fetch'));
		assert.ok(result.includes('FormData'));
	});

	it('should handle POST requests with redirect', async () => {
		const shareModule = await import('../../../pages/share.js');
		const result = await shareModule.post();
		
		assert.strictEqual(typeof result, 'object');
		assert.strictEqual(result.statusCode, 302);
		assert.ok(result.headers.Location.includes('/share'));
	});

	it('should include CSS styling', async () => {
		const shareModule = await import('../../../pages/share.js');
		const result = await shareModule.get();
		
		assert.ok(result.includes('<style>'));
		assert.ok(result.includes('.share-form'));
		assert.ok(result.includes('.form-group'));
		assert.ok(result.includes('.submit-button'));
	});
});