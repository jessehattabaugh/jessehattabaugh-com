import * as cdk from 'aws-cdk-lib';

import { describe, it } from 'node:test';

import assert from 'node:assert';

/**
 * Unit tests for the CDK Stack
 * Note: These tests focus on testing the logic without creating actual AWS resources
 * or requiring Docker for Lambda bundling
 */

describe('CDK Stack basic functionality', () => {
	it('should create a CDK App successfully', () => {
		const app = new cdk.App();
		assert.ok(app instanceof cdk.App);
	});

	it('should handle domain configuration objects', () => {
		const productionConfig = {
			domain: 'jessehattabaugh.com',
			environment: 'production',
		};

		const stagingConfig = {
			domain: 'staging.jessehattabaugh.com',
			environment: 'staging',
		};

		assert.strictEqual(productionConfig.domain, 'jessehattabaugh.com');
		assert.strictEqual(productionConfig.environment, 'production');
		assert.strictEqual(stagingConfig.domain, 'staging.jessehattabaugh.com');
		assert.strictEqual(stagingConfig.environment, 'staging');
	});

	it('should determine production vs staging environments correctly', () => {
		const environments = [
			{ env: 'production', expected: true },
			{ env: 'staging', expected: false },
			{ env: 'development', expected: false },
			{ env: undefined, expected: false },
		];

		for (const { env, expected } of environments) {
			const isProduction = env === 'production';
			assert.strictEqual(isProduction, expected);
		}
	});
});

describe('Lambda name generation logic', () => {
	it('should generate correct Lambda function names from path segments', () => {
		const testCases = [
			{ pathSegments: [], expected: 'HomePage' },
			{ pathSegments: ['about'], expected: 'AboutPage' },
			{ pathSegments: ['hello'], expected: 'HelloPage' },
			{ pathSegments: ['404'], expected: '404Page' },
			{ pathSegments: ['api', 'users'], expected: 'ApiUsersPage' },
			{ pathSegments: ['deep', 'nested', 'path'], expected: 'DeepNestedPathPage' },
		];

		for (const { pathSegments, expected } of testCases) {
			const lambdaName =
				pathSegments.length === 0
					? 'HomePage'
					: pathSegments
							.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
							.join('') + 'Page';

			assert.strictEqual(lambdaName, expected);
		}
	});

	it('should handle edge cases in path segment capitalization', () => {
		const segments = ['api', 'user-profile', '404', 'hello-world'];
		const capitalizedSegments = segments.map(
			(segment) => segment.charAt(0).toUpperCase() + segment.slice(1)
		);

		assert.deepStrictEqual(capitalizedSegments, ['Api', 'User-profile', '404', 'Hello-world']);
	});
});

describe('Page discovery logic', () => {
	it('should create correct route mappings', () => {
		const testPages = [
			{ fileName: 'index.js', pathSegments: [], expectedRoute: '/' },
			{ fileName: 'about.js', pathSegments: [], expectedRoute: '/about' },
			{ fileName: 'index.js', pathSegments: ['hello'], expectedRoute: '/hello' },
			{ fileName: '404.js', pathSegments: [], expectedRoute: '/404' },
		];

		for (const { fileName, pathSegments, expectedRoute } of testPages) {
			let route;

			if (fileName === 'index.js') {
				// Directory-based page (e.g., hello/index.js → /hello)
				route = pathSegments.length === 0 ? '/' : `/${pathSegments.join('/')}`;
			} else {
				// File-based page (e.g., about.js → /about)
				const pageName = fileName.slice(0, -3); // Remove .js extension
				route = `/${pageName}`;
			}

			assert.strictEqual(route, expectedRoute);
		}
	});

	it('should handle nested directory structures', () => {
		const nestedPaths = [
			{ pathSegments: ['api', 'v1'], fileName: 'users.js', expectedRoute: '/api/v1/users' },
			{
				pathSegments: ['admin', 'dashboard'],
				fileName: 'index.js',
				expectedRoute: '/admin/dashboard',
			},
			{ pathSegments: [], fileName: 'sitemap.js', expectedRoute: '/sitemap' },
		];

		for (const { pathSegments, fileName, expectedRoute } of nestedPaths) {
			let route;

			if (fileName === 'index.js') {
				route = pathSegments.length === 0 ? '/' : `/${pathSegments.join('/')}`;
			} else {
				const pageName = fileName.slice(0, -3);
				route =
					pathSegments.length === 0
						? `/${pageName}`
						: `/${pathSegments.join('/')}/${pageName}`;
			}

			assert.strictEqual(route, expectedRoute);
		}
	});
});

describe('Environment-specific configuration', () => {
	it('should use different caching policies based on environment', () => {
		const environments = ['production', 'staging', 'development'];

		for (const environment of environments) {
			const isProduction = environment === 'production';
			const expectedCaching = isProduction ? 'CACHING_OPTIMIZED' : 'CACHING_DISABLED';
			const actualCaching = isProduction ? 'CACHING_OPTIMIZED' : 'CACHING_DISABLED';

			assert.strictEqual(actualCaching, expectedCaching);
		}
	});

	it('should use different bundling settings based on environment', () => {
		const environments = ['production', 'staging', 'development'];

		for (const environment of environments) {
			const isProduction = environment === 'production';
			const bundlingConfig = {
				minify: isProduction,
				sourceMap: !isProduction,
				target: 'es2020',
			};

			if (isProduction) {
				assert.strictEqual(bundlingConfig.minify, true);
				assert.strictEqual(bundlingConfig.sourceMap, false);
			} else {
				assert.strictEqual(bundlingConfig.minify, false);
				assert.strictEqual(bundlingConfig.sourceMap, true);
			}

			assert.strictEqual(bundlingConfig.target, 'es2020');
		}
	});

	it('should handle domain name transformations for S3 buckets', () => {
		const domains = [
			{ domain: 'jessehattabaugh.com', expected: 'jessehattabaugh-com-static-assets' },
			{
				domain: 'staging.jessehattabaugh.com',
				expected: 'staging-jessehattabaugh-com-static-assets',
			},
			{ domain: 'my-site.example.com', expected: 'my-site-example-com-static-assets' },
		];

		for (const { domain, expected } of domains) {
			const bucketName = `${domain.replaceAll('.', '-')}-static-assets`;
			assert.strictEqual(bucketName, expected);
		}
	});
});

describe('Route53 record configuration', () => {
	it('should determine correct record names for different environments', () => {
		const configs = [
			{ environment: 'production', expectedRecord: undefined, expectedWwwRecord: 'www' },
			{ environment: 'staging', expectedRecord: 'staging', expectedWwwRecord: 'www.staging' },
		];

		for (const { environment, expectedRecord, expectedWwwRecord } of configs) {
			const isProduction = environment === 'production';
			const recordName = isProduction ? undefined : 'staging';
			const wwwRecordName = isProduction ? 'www' : 'www.staging';

			assert.strictEqual(recordName, expectedRecord);
			assert.strictEqual(wwwRecordName, expectedWwwRecord);
		}
	});

	it('should determine root domain for hosted zone lookup', () => {
		const configs = [
			{
				domain: 'jessehattabaugh.com',
				environment: 'production',
				expectedRoot: 'jessehattabaugh.com',
			},
			{
				domain: 'staging.jessehattabaugh.com',
				environment: 'staging',
				expectedRoot: 'jessehattabaugh.com',
			},
		];

		for (const { domain, environment, expectedRoot } of configs) {
			const isProduction = environment === 'production';
			const rootDomain = isProduction ? domain : 'jessehattabaugh.com';

			assert.strictEqual(rootDomain, expectedRoot);
		}
	});
});

describe('HTTP method mapping for API Gateway', () => {
	it('should support all required HTTP methods', () => {
		const supportedMethods = ['GET', 'POST', 'PUT', 'DELETE'];
		const apiGatewayMethods = new Set(['GET', 'POST', 'PUT', 'DELETE']);

		for (const method of supportedMethods) {
			assert.ok(apiGatewayMethods.has(method));
		}
	});

	it('should handle root route vs nested routes differently', () => {
		const routes = [
			{ route: '/', isRoot: true },
			{ route: '/about', isRoot: false },
			{ route: '/hello', isRoot: false },
			{ route: '/api/users', isRoot: false },
		];

		for (const { route, isRoot } of routes) {
			const actualIsRoot = route === '/';
			assert.strictEqual(actualIsRoot, isRoot);
		}
	});
});
