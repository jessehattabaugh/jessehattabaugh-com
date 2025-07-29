import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';

import { readdirSync, statSync } from 'node:fs';

import { Construct } from 'constructs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Properties for the Website construct
 * @typedef {Object} WebsiteConstructProps
 * @property {string} environment - The deployment environment (staging/production)
 * @property {string} domain - The domain name for the website
 * @property {string} certificateArn - The ACM certificate ARN
 * @property {boolean} [skipCloudFront=false] - Whether to skip CloudFront creation
 */

/**
 * Website Construct - Manages the serverless website infrastructure
 * This construct encapsulates Lambda functions, API Gateway, S3, and optional CloudFront
 */
export class WebsiteConstruct extends Construct {
	constructor(scope, id, properties) {
		super(scope, id);

		const { environment, domain, certificateArn, skipCloudFront = false } = properties;
		const isProduction = environment === 'production';

		// S3 bucket for static assets with proper security defaults
		this.staticBucket = new s3.Bucket(this, 'StaticAssets', {
			removalPolicy: isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
			autoDeleteObjects: !isProduction,
			enforceSSL: true, // Security by default
			publicReadAccess: false, // Security by default
			blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, // Security by default
			encryption: s3.BucketEncryption.S3_MANAGED, // Security by default
			// eslint-disable-next-line sonarjs/aws-s3-bucket-versioning
			versioned: false, // Static assets don't need versioning for this use case
			cors: [
				{
					allowedMethods: [s3.HttpMethods.GET],
					allowedOrigins: skipCloudFront
						? ['*']
						: [`https://${domain}`, `https://www.${domain}`],
					allowedHeaders: ['*'],
					maxAge: 3600,
				},
			],
		});

		// Deploy static assets to S3 with reproducible bundling
		new s3deploy.BucketDeployment(this, 'DeployStaticAssets', {
			sources: [s3deploy.Source.asset(path.join(__dirname, '../../static'))],
			destinationBucket: this.staticBucket,
			memoryLimit: 512,
			timeout: cdk.Duration.minutes(15),
			prune: true, // Remove old files
		});

		// API Gateway with security defaults
		this.api = new apigateway.RestApi(this, 'WebsiteApi', {
			restApiName: `Jesse Hattabaugh Website API (${environment})`,
			description: `API Gateway for ${domain}`,
			endpointConfiguration: {
				types: [apigateway.EndpointType.REGIONAL],
			},
			defaultCorsPreflightOptions: {
				allowOrigins: skipCloudFront
					? ['*']
					: [`https://${domain}`, `https://www.${domain}`],
				allowMethods: apigateway.Cors.ALL_METHODS,
				allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
				allowCredentials: false,
			},
		});

		// Discover and create Lambda functions for pages
		this.pages = this._discoverPages(path.join(__dirname, '../../pages'));
		this.lambdaFunctions = new Map();

		for (const page of this.pages) {
			// Create Lambda function with security defaults
			const lambdaFunction = new nodejs.NodejsFunction(this, `${page.lambdaName}Function`, {
				entry: path.join(__dirname, '../handlers.js'),
				handler: 'pageHandler',
				runtime: lambda.Runtime.NODEJS_22_X,
				timeout: cdk.Duration.seconds(30),
				memorySize: 512,
				bundling: {
					minify: isProduction,
					sourceMap: !isProduction,
					target: 'es2022',
					format: nodejs.OutputFormat.ESM,
					externalModules: [],
					forceDockerBundling: false,
					commandHooks: {
						beforeBundling(inputDirectory, outputDirectory) {
							return [
								`cp -r ${inputDirectory}/pages ${outputDirectory}/`,
								`cp -r ${inputDirectory}/lib ${outputDirectory}/`,
							];
						},
						beforeInstall: () => [],
						afterBundling: () => [],
					},
				},
				environment: {
					NODE_ENV: environment,
					ENVIRONMENT: environment,
					PAGE_ROUTE: page.route,
					PAGE_MODULE_PATH: page.modulePath,
				},
				// Security: Least privilege IAM
				initialPolicy: [],
			});

			this.lambdaFunctions.set(page.route, lambdaFunction);

			// Create API Gateway integration
			const integration = new apigateway.LambdaIntegration(lambdaFunction, {
				requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
			});

			// Add routes to API Gateway
			this._addApiRoutes(page, integration);
		}

		// Conditionally create CloudFront distribution
		if (!skipCloudFront && certificateArn) {
			this._createCloudFront(domain, certificateArn, isProduction);
		}
	}

	/**
	 * Creates CloudFront distribution with security defaults
	 * @private
	 */
	_createCloudFront(domain, certificateArn, isProduction) {
		const certificate = acm.Certificate.fromCertificateArn(this, 'Certificate', certificateArn);

		this.distribution = new cloudfront.Distribution(this, 'Distribution', {
			defaultBehavior: {
				origin: new origins.RestApiOrigin(this.api),
				viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
				cachePolicy: isProduction
					? cloudfront.CachePolicy.CACHING_OPTIMIZED
					: cloudfront.CachePolicy.CACHING_DISABLED,
				allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
				compress: true,
			},
			additionalBehaviors: {
				'/static/*': {
					origin: new origins.S3BucketOrigin(this.staticBucket),
					viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
					cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
					allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
					compress: true,
				},
			},
			domainNames: [domain], // Only use the specific domain, not www variant
			certificate,
			comment: `CloudFront distribution for ${domain}`,
			httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
			enableIpv6: true,
			priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // Cost optimization
		});
	}

	/**
	 * Adds API routes for a page
	 * @private
	 */
	_addApiRoutes(page, integration) {
		if (page.route === '/') {
			// Root route
			this.api.root.addMethod('GET', integration);
			this.api.root.addMethod('POST', integration);
			this.api.root.addMethod('PUT', integration);
			this.api.root.addMethod('DELETE', integration);
		} else {
			// Create nested resources for the route
			let currentResource = this.api.root;
			const segments = page.pathSegments;

			for (const segment of segments) {
				let nextResource = currentResource.getResource(segment);
				if (!nextResource) {
					nextResource = currentResource.addResource(segment);
				}
				currentResource = nextResource;
			}

			// Add all HTTP methods to the resource
			currentResource.addMethod('GET', integration);
			currentResource.addMethod('POST', integration);
			currentResource.addMethod('PUT', integration);
			currentResource.addMethod('DELETE', integration);
		}
	}

	/**
	 * Creates page object for directory-based routes (index.js files)
	 * @private
	 */
	_createDirectoryPage(pathSegments, fullPath) {
		const route = pathSegments.length === 0 ? '/' : `/${pathSegments.join('/')}`;
		const lambdaName = _generateLambdaName(pathSegments);
		const modulePath =
			pathSegments.length === 0
				? './pages/index.js'
				: `./pages/${pathSegments.join('/')}/index.js`;

		return {
			route,
			lambdaName,
			entryPath: fullPath,
			pathSegments,
			modulePath,
		};
	}

	/**
	 * Creates page object for file-based routes (.js files)
	 * @private
	 */
	_createFilePage(entry, pathSegments, fullPath) {
		const pageName = entry.slice(0, -3); // Remove .js extension
		const route =
			pathSegments.length === 0 ? `/${pageName}` : `/${pathSegments.join('/')}/${pageName}`;
		const allSegments = pathSegments.length === 0 ? [pageName] : [...pathSegments, pageName];
		const lambdaName = _generateLambdaName(allSegments);
		const modulePath =
			pathSegments.length === 0
				? `./pages/${pageName}.js`
				: `./pages/${pathSegments.join('/')}/${pageName}.js`;

		return {
			route,
			lambdaName,
			entryPath: fullPath,
			pathSegments: allSegments,
			modulePath,
		};
	}

	/**
	 * Recursively scans directory for page files
	 * @private
	 */
	_scanDirectory(directory, pathSegments, pages) {
		const entries = readdirSync(directory);

		// Move iteration down - batch process all entries
		for (const entry of entries) {
			const fullPath = path.join(directory, entry);
			const stats = statSync(fullPath);

			if (stats.isDirectory()) {
				this._scanDirectory(fullPath, [...pathSegments, entry], pages);
				continue;
			}

			if (entry === 'index.js') {
				pages.push(this._createDirectoryPage(pathSegments, fullPath));
				continue;
			}

			if (entry.endsWith('.js')) {
				pages.push(this._createFilePage(entry, pathSegments, fullPath));
			}
		}
	}

	/**
	 * Discovers all page files in the /pages folder
	 * @private
	 */
	_discoverPages(pagesDirectory) {
		const pages = [];
		this._scanDirectory(pagesDirectory, [], pages);
		return pages;
	}
}

/**
 * Helper to generate Lambda function names from path segments.
 * @private
 */
function _generateLambdaName(pathSegments) {
	return pathSegments.length === 0
		? 'HomePage'
		: pathSegments
				.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
				.join('') + 'Page';
}
