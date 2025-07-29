import { describe, it } from 'node:test';
import assert from 'node:assert';

/**
 * Tests for the shares listing page
 */
describe('Shares page functionality', () => {
	it('should export get handler function', async () => {
		const sharesModule = await import('../../../pages/shares.js');
		assert.strictEqual(typeof sharesModule.get, 'function');
	});

	it('should render shares listing HTML', async () => {
		const sharesModule = await import('../../../pages/shares.js');
		const result = await sharesModule.get();
		
		assert.strictEqual(typeof result, 'string');
		assert.ok(result.includes('<!DOCTYPE html>'));
		assert.ok(result.includes('Shared Content'));
		assert.ok(result.includes('shares-page'));
	});

	it('should include mock shares data', async () => {
		const sharesModule = await import('../../../pages/shares.js');
		const result = await sharesModule.get();
		
		assert.ok(result.includes('share-card'));
		assert.ok(result.includes('Amazing JavaScript Framework'));
		assert.ok(result.includes('Interesting Article on AI'));
	});

	it('should include share author with masked email', async () => {
		const sharesModule = await import('../../../pages/shares.js');
		const result = await sharesModule.get();
		
		assert.ok(result.includes('Shared by us***@example.com'));
		assert.ok(result.includes('Shared by an***@example.com'));
	});

	it('should include links to share submission page', async () => {
		const sharesModule = await import('../../../pages/shares.js');
		const result = await sharesModule.get();
		
		assert.ok(result.includes('href="/share"'));
		assert.ok(result.includes('Share Something'));
	});

	it('should include CSS styling for shares', async () => {
		const sharesModule = await import('../../../pages/shares.js');
		const result = await sharesModule.get();
		
		assert.ok(result.includes('<style>'));
		assert.ok(result.includes('.shares-container'));
		assert.ok(result.includes('.share-card'));
		assert.ok(result.includes('.share-header'));
		assert.ok(result.includes('.share-content'));
	});

	it('should handle responsive design with media queries', async () => {
		const sharesModule = await import('../../../pages/shares.js');
		const result = await sharesModule.get();
		
		assert.ok(result.includes('@media'));
		assert.ok(result.includes('max-width: 600px'));
	});

	it('should include proper link handling for external URLs', async () => {
		const sharesModule = await import('../../../pages/shares.js');
		const result = await sharesModule.get();
		
		assert.ok(result.includes('target="_blank"'));
		assert.ok(result.includes('rel="noopener noreferrer"'));
	});
});