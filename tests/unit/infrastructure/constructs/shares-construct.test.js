import { describe, it } from 'node:test';
import assert from 'node:assert';
import { App, Stack } from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

/**
 * Tests for the SharesConstruct
 */
describe('Shares construct functionality', () => {
	it('should import SharesConstruct successfully', async () => {
		const { SharesConstruct } = await import('../../../infrastructure/constructs/shares-construct.js');
		assert.strictEqual(typeof SharesConstruct, 'function');
	});

	it('should create construct with required properties', async () => {
		const { SharesConstruct } = await import('../../../infrastructure/constructs/shares-construct.js');
		const app = new App();
		const stack = new Stack(app, 'TestStack');
		
		// Create a mock API Gateway
		const api = new apigateway.RestApi(stack, 'TestApi');
		
		const construct = new SharesConstruct(stack, 'TestShares', {
			environment: 'test',
			domain: 'test.example.com',
			api,
		});
		
		assert.ok(construct);
		assert.ok(construct.sharesTable);
		assert.ok(construct.sharesBucket);
		assert.ok(construct.submitShareFunction);
		assert.ok(construct.verifyEmailFunction);
		assert.ok(construct.approveShareFunction);
		assert.ok(construct.emailNotificationFunction);
	});

	it('should handle production environment configuration', async () => {
		const { SharesConstruct } = await import('../../../infrastructure/constructs/shares-construct.js');
		const app = new App();
		const stack = new Stack(app, 'TestStack');
		const api = new apigateway.RestApi(stack, 'TestApi');
		
		const construct = new SharesConstruct(stack, 'TestShares', {
			environment: 'production',
			domain: 'jessehattabaugh.com',
			api,
		});
		
		assert.ok(construct);
		// Production should have different settings than development
		assert.strictEqual(construct.sharesTable.removalPolicy, 'Retain');
	});

	it('should handle staging environment configuration', async () => {
		const { SharesConstruct } = await import('../../../infrastructure/constructs/shares-construct.js');
		const app = new App();
		const stack = new Stack(app, 'TestStack');
		const api = new apigateway.RestApi(stack, 'TestApi');
		
		const construct = new SharesConstruct(stack, 'TestShares', {
			environment: 'staging',
			domain: 'staging.jessehattabaugh.com',
			api,
		});
		
		assert.ok(construct);
		// Staging should have different settings than production
		assert.strictEqual(construct.sharesTable.removalPolicy, 'Destroy');
	});

	it('should validate required properties', async () => {
		const { SharesConstruct } = await import('../../../infrastructure/constructs/shares-construct.js');
		const app = new App();
		const stack = new Stack(app, 'TestStack');
		const api = new apigateway.RestApi(stack, 'TestApi');
		
		// Should not throw when all required properties are provided
		const construct = new SharesConstruct(stack, 'TestShares', {
			environment: 'test',
			domain: 'test.example.com',
			api,
		});
		
		assert.ok(construct);
	});
});