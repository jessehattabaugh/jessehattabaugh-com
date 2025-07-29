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
		assert(result.includes('<!DOCTYPE html>'));
		assert(result.includes('Shared Content'));
		assert(result.includes('shares-page'));
	});

	it('should include mock shares data', async () => {
		const sharesModule = await import('../../../pages/shares.js');
		const result = await sharesModule.get();
		
		assert(result.includes('share-card'));
		assert(result.includes('Amazing JavaScript Framework'));
		assert(result.includes('Interesting Article on AI'));
	});

	it('should include share author with masked email', async () => {
		const sharesModule = await import('../../../pages/shares.js');
		const result = await sharesModule.get();
		
		assert(result.includes('Shared by us***@example.com'));
		assert(result.includes('Shared by an***@example.com'));
	});

	it('should include links to share submission page', async () => {
		const sharesModule = await import('../../../pages/shares.js');
		const result = await sharesModule.get();
		
		assert(result.includes('href="/share"'));
		assert(result.includes('Share Something'));
	});

	it('should include CSS styling for shares', async () => {
		const sharesModule = await import('../../../pages/shares.js');
		const result = await sharesModule.get();
		
		assert(result.includes('<style>'));
		assert(result.includes('.shares-container'));
		assert(result.includes('.share-card'));
		assert(result.includes('.share-header'));
		assert(result.includes('.share-content'));
	});

	it('should handle responsive design with media queries', async () => {
		const sharesModule = await import('../../../pages/shares.js');
		const result = await sharesModule.get();
		
		assert(result.includes('@media'));
		assert(result.includes('max-width: 600px'));
	});

	it('should include proper link handling for external URLs', async () => {
		const sharesModule = await import('../../../pages/shares.js');
		const result = await sharesModule.get();
		
		assert(result.includes('target="_blank"'));
		assert(result.includes('rel="noopener noreferrer"'));
	});
});