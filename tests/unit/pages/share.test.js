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
		assert(result.includes('<!DOCTYPE html>'));
		assert(result.includes('Share Something'));
		assert(result.includes('shareForm'));
		assert(result.includes('type="email"'));
		assert(result.includes('type="text"'));
		assert(result.includes('textarea'));
		assert(result.includes('type="file"'));
	});

	it('should include form validation in HTML', async () => {
		const shareModule = await import('../../../pages/share.js');
		const result = await shareModule.get();
		
		assert(result.includes('required'));
		assert(result.includes('placeholder'));
		assert(result.includes('accept="image/*"'));
	});

	it('should include JavaScript for form submission', async () => {
		const shareModule = await import('../../../pages/share.js');
		const result = await shareModule.get();
		
		assert(result.includes('<script>'));
		assert(result.includes('addEventListener'));
		assert(result.includes('fetch'));
		assert(result.includes('FormData'));
	});

	it('should handle POST requests with redirect', async () => {
		const shareModule = await import('../../../pages/share.js');
		const result = await shareModule.post();
		
		assert.strictEqual(typeof result, 'object');
		assert.strictEqual(result.statusCode, 302);
		assert(result.headers.Location.includes('/share'));
	});

	it('should include CSS styling', async () => {
		const shareModule = await import('../../../pages/share.js');
		const result = await shareModule.get();
		
		assert(result.includes('<style>'));
		assert(result.includes('.share-form'));
		assert(result.includes('.form-group'));
		assert(result.includes('.submit-button'));
	});
});