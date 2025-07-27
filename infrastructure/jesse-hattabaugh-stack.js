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

import { dirname, join } from 'path';

import { Construct } from 'constructs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class JesseHattabaughStack extends cdk.Stack {
	constructor(scope, id, props) {
		super(scope, id, props);

		const { domain, environment } = props;
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

		// Lambda function for home page
		const homePageFunction = new nodejs.NodejsFunction(this, 'HomePageFunction', {
			entry: join(__dirname, '../pages/index.js'),
			handler: 'handler',
			runtime: lambda.Runtime.NODEJS_18_X,
			bundling: {
				minify: isProduction,
				sourceMap: true,
				target: 'es2020',
				format: nodejs.OutputFormat.CJS,
				externalModules: [],
			},
			environment: {
				NODE_ENV: environment,
				ENVIRONMENT: environment,
			},
		});

		// Lambda function for hello page
		const helloPageFunction = new nodejs.NodejsFunction(this, 'HelloPageFunction', {
			entry: join(__dirname, '../pages/hello/index.js'),
			handler: 'handler',
			runtime: lambda.Runtime.NODEJS_18_X,
			bundling: {
				minify: isProduction,
				sourceMap: true,
				target: 'es2020',
				format: nodejs.OutputFormat.CJS,
				externalModules: [],
			},
			environment: {
				NODE_ENV: environment,
				ENVIRONMENT: environment,
			},
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

		// API Gateway integrations
		const homePageIntegration = new apigateway.LambdaIntegration(homePageFunction);
		const helloPageIntegration = new apigateway.LambdaIntegration(helloPageFunction);

		// API Gateway routes
		api.root.addMethod('GET', homePageIntegration);
		const helloResource = api.root.addResource('hello');
		helloResource.addMethod('GET', helloPageIntegration);

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
				allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
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
