import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as targets from 'aws-cdk-lib/aws-route53-targets';

import { dirname, join } from 'node:path';
import { readdirSync, statSync } from 'node:fs';

import { Construct } from 'constructs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Synchronously discovers all page directories in the /pages folder
 */
function discoverPages(pagesDir) {
	const pages = [];

	function scanDirectory(dir, pathSegments = []) {
		const entries = readdirSync(dir);

		for (const entry of entries) {
			const fullPath = join(dir, entry);
			const stats = statSync(fullPath);

			if (stats.isDirectory()) {
				// Recursively scan subdirectories
				scanDirectory(fullPath, [...pathSegments, entry]);
			} else if (entry === 'index.js') {
				// Found a page
				const route = pathSegments.length === 0 ? '/' : `/${pathSegments.join('/')}`;
				const lambdaName =
					pathSegments.length === 0
						? 'HomePage'
						: pathSegments
								.map(
									(segment) => segment.charAt(0).toUpperCase() + segment.slice(1)
								)
								.join('') + 'Page';

				pages.push({
					route,
					lambdaName,
					entryPath: fullPath,
					pathSegments,
				});
			}
		}
	}

	scanDirectory(pagesDir);
	return pages;
}

export class JesseHattabaughStack extends cdk.Stack {
	constructor(scope, id, properties) {
		super(scope, id, properties);

		const { domain, environment } = properties;
		const isProduction = environment === 'production';

		// S3 bucket for static assets
		const staticBucket = new s3.Bucket(this, 'StaticAssets', {
			bucketName: `${domain.replace('.', '-')}-static-assets`,
			removalPolicy: cdk.RemovalPolicy.DESTROY,
			autoDeleteObjects: true,
			cors: [
				{
					allowedMethods: [s3.HttpMethods.GET],
					allowedOrigins: ['*'],
					allowedHeaders: ['*'],
				},
			],
		});

		// Deploy static assets to S3
		new s3deploy.BucketDeployment(this, 'DeployStaticAssets', {
			sources: [s3deploy.Source.asset(join(__dirname, '../static'))],
			destinationBucket: staticBucket,
		});

		// API Gateway
		const api = new apigateway.RestApi(this, 'WebsiteApi', {
			restApiName: `Jesse Hattabaugh Website API (${environment})`,
			description: `API Gateway for ${domain}`,
			defaultCorsPreflightOptions: {
				allowOrigins: apigateway.Cors.ALL_ORIGINS,
				allowMethods: apigateway.Cors.ALL_METHODS,
			},
		});

		// Discover all pages automatically
		const pagesDir = join(__dirname, '../pages');
		const pages = discoverPages(pagesDir);

		console.log('Discovered pages:', pages);

		// Create Lambda functions and API routes for each discovered page
		const lambdaFunctions = new Map();

		for (const page of pages) {
			// Create Lambda function using the universal handler
			const lambdaFunction = new nodejs.NodejsFunction(this, `${page.lambdaName}Function`, {
				entry: join(__dirname, './universal-handler.js'),
				handler: 'handler',
				runtime: lambda.Runtime.NODEJS_22_X,
				bundling: {
					minify: isProduction,
					sourceMap: true,
					target: 'es2020',
					format: nodejs.OutputFormat.ESM,
					externalModules: [],
				},
				environment: {
					NODE_ENV: environment,
					ENVIRONMENT: environment,
					PAGE_MODULE_PATH: page.entryPath,
				},
			});

			lambdaFunctions.set(page.route, lambdaFunction);

			// Create API Gateway integration
			const integration = new apigateway.LambdaIntegration(lambdaFunction);

			// Add routes to API Gateway
			if (page.route === '/') {
				// Root route
				api.root.addMethod('GET', integration);
				api.root.addMethod('POST', integration);
				api.root.addMethod('PUT', integration);
				api.root.addMethod('DELETE', integration);
			} else {
				// Create nested resources for the route
				let currentResource = api.root;
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

		// Certificate for CloudFront (must be in us-east-1)
		const certificate = new acm.Certificate(this, 'Certificate', {
			domainName: domain,
			subjectAlternativeNames: [`www.${domain}`],
			validation: acm.CertificateValidation.fromDns(),
		});

		// CloudFront distribution
		const distribution = new cloudfront.Distribution(this, 'Distribution', {
			defaultBehavior: {
				origin: new origins.RestApiOrigin(api),
				viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
				cachePolicy: isProduction
					? cloudfront.CachePolicy.CACHING_OPTIMIZED
					: cloudfront.CachePolicy.CACHING_DISABLED,
				allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
			},
			additionalBehaviors: {
				'/static/*': {
					origin: new origins.S3Origin(staticBucket),
					viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
					cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
					allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
				},
			},
			domainNames: [domain, `www.${domain}`],
			certificate,
			comment: `CloudFront distribution for ${domain} (${environment})`,
		});

		// Route53 hosted zone lookup
		// For staging, we assume the subdomain is managed in the same hosted zone as the main domain
		const rootDomain = isProduction ? domain : 'jessehattabaugh.com';
		const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
			domainName: rootDomain,
		});

		// Route53 records
		const recordName = isProduction ? undefined : 'staging';
		new route53.ARecord(this, 'AliasRecord', {
			zone: hostedZone,
			recordName,
			target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
		});

		new route53.ARecord(this, 'WwwAliasRecord', {
			zone: hostedZone,
			recordName: isProduction ? 'www' : 'www.staging',
			target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
		});

		// Outputs
		new cdk.CfnOutput(this, 'Environment', {
			value: environment,
			description: 'Deployment environment',
		});

		new cdk.CfnOutput(this, 'DiscoveredPages', {
			value: JSON.stringify(pages.map((p) => p.route)),
			description: 'Automatically discovered page routes',
		});

		new cdk.CfnOutput(this, 'ApiGatewayUrl', {
			value: api.url,
			description: 'API Gateway URL',
		});

		new cdk.CfnOutput(this, 'CloudFrontUrl', {
			value: `https://${distribution.distributionDomainName}`,
			description: 'CloudFront distribution URL',
		});

		new cdk.CfnOutput(this, 'WebsiteUrl', {
			value: `https://${domain}`,
			description: 'Website URL',
		});

		new cdk.CfnOutput(this, 'StaticBucketName', {
			value: staticBucket.bucketName,
			description: 'S3 bucket name for static assets',
		});
	}
}
