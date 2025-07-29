import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ses from 'aws-cdk-lib/aws-ses';

import { Construct } from 'constructs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Properties for the Shares construct
 * @typedef {Object} SharesConstructProps
 * @property {string} environment - The deployment environment (staging/production)
 * @property {string} domain - The domain name for the website
 * @property {import('aws-cdk-lib/aws-apigateway').RestApi} api - Existing API Gateway to add routes to
 */

/**
 * Shares Construct - Manages the sharing functionality infrastructure
 * This construct encapsulates DynamoDB table, S3 bucket, Lambda functions, and SES for the shares feature
 */
export class SharesConstruct extends Construct {
	constructor(scope, id, properties) {
		super(scope, id);

		const { environment, domain, api } = properties;
		const isProduction = environment === 'production';

		// DynamoDB table for shares data with security defaults
		this.sharesTable = new dynamodb.Table(this, 'SharesTable', {
			partitionKey: { name: 'shareId', type: dynamodb.AttributeType.STRING },
			billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
			encryption: dynamodb.TableEncryption.AWS_MANAGED, // Security by default
			pointInTimeRecovery: isProduction, // Data protection for production
			removalPolicy: isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
			
			// GSI for listing published shares efficiently
			globalSecondaryIndexes: [
				{
					indexName: 'PublishedIndex',
					partitionKey: { name: 'published', type: dynamodb.AttributeType.STRING },
					sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
				}
			],
		});

		// S3 bucket for public share images with proper security defaults
		/* eslint-disable sonarjs/aws-s3-bucket-granted-access, sonarjs/aws-s3-bucket-public-access */
		this.sharesBucket = new s3.Bucket(this, 'SharesBucket', {
			removalPolicy: isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
			autoDeleteObjects: !isProduction,
			enforceSSL: true, // Security by default
			publicReadAccess: true, // Images need to be publicly accessible for shares feature
			// Allow public access for share images - this is intentional for the shares feature
			blockPublicAccess: new s3.BlockPublicAccess({
				blockPublicAcls: false, // Allow public ACLs for image uploads
				blockPublicPolicy: false, // Allow public bucket policy
				ignorePublicAcls: false, // Don't ignore public ACLs
				restrictPublicBuckets: false, // Don't restrict public buckets
			}),
			encryption: s3.BucketEncryption.S3_MANAGED, // Security by default
			versioned: true, // Enable versioning for data protection
			cors: [
				{
					allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
					allowedOrigins: [`https://${domain}`],
					allowedHeaders: ['*'],
					maxAge: 3600,
				},
			],
		});
		/* eslint-enable sonarjs/aws-s3-bucket-granted-access, sonarjs/aws-s3-bucket-public-access */

		// SES identity for sending emails (domain verification required separately)
		this.emailIdentity = new ses.EmailIdentity(this, 'SharesEmailIdentity', {
			identity: ses.Identity.domain(domain),
		});

		// Lambda function for handling share submissions
		this.submitShareFunction = new nodejs.NodejsFunction(this, 'SubmitShareFunction', {
			entry: path.join(__dirname, '../lambda/submit-share.js'),
			handler: 'handler',
			runtime: lambda.Runtime.NODEJS_22_X,
			timeout: cdk.Duration.seconds(30),
			memorySize: 512,
			bundling: {
				minify: isProduction,
				sourceMap: !isProduction,
				target: 'es2022',
				format: nodejs.OutputFormat.ESM,
				externalModules: [],
			},
			environment: {
				SHARES_TABLE_NAME: this.sharesTable.tableName,
				SHARES_BUCKET_NAME: this.sharesBucket.bucketName,
				DOMAIN: domain,
				ENVIRONMENT: environment,
			},
		});

		// Lambda function for email verification
		this.verifyEmailFunction = new nodejs.NodejsFunction(this, 'VerifyEmailFunction', {
			entry: path.join(__dirname, '../lambda/verify-email.js'),
			handler: 'handler',
			runtime: lambda.Runtime.NODEJS_22_X,
			timeout: cdk.Duration.seconds(30),
			memorySize: 512,
			bundling: {
				minify: isProduction,
				sourceMap: !isProduction,
				target: 'es2022',
				format: nodejs.OutputFormat.ESM,
				externalModules: [],
			},
			environment: {
				SHARES_TABLE_NAME: this.sharesTable.tableName,
				DOMAIN: domain,
				ENVIRONMENT: environment,
			},
		});

		// Lambda function for admin approval
		this.approveShareFunction = new nodejs.NodejsFunction(this, 'ApproveShareFunction', {
			entry: path.join(__dirname, '../lambda/approve-share.js'),
			handler: 'handler',
			runtime: lambda.Runtime.NODEJS_22_X,
			timeout: cdk.Duration.seconds(30),
			memorySize: 512,
			bundling: {
				minify: isProduction,
				sourceMap: !isProduction,
				target: 'es2022',
				format: nodejs.OutputFormat.ESM,
				externalModules: [],
			},
			environment: {
				SHARES_TABLE_NAME: this.sharesTable.tableName,
				DOMAIN: domain,
				ENVIRONMENT: environment,
			},
		});

		// Lambda function for sending verification and approval emails
		this.emailNotificationFunction = new nodejs.NodejsFunction(this, 'EmailNotificationFunction', {
			entry: path.join(__dirname, '../lambda/email-notification.js'),
			handler: 'handler',
			runtime: lambda.Runtime.NODEJS_22_X,
			timeout: cdk.Duration.seconds(30),
			memorySize: 512,
			bundling: {
				minify: isProduction,
				sourceMap: !isProduction,
				target: 'es2022',
				format: nodejs.OutputFormat.ESM,
				externalModules: [],
			},
			environment: {
				SHARES_TABLE_NAME: this.sharesTable.tableName,
				DOMAIN: domain,
				ENVIRONMENT: environment,
				ADMIN_EMAIL: `shares@${domain}`,
			},
		});

		// Grant permissions following least privilege principle
		this.sharesTable.grantReadWriteData(this.submitShareFunction);
		this.sharesTable.grantReadWriteData(this.verifyEmailFunction);
		this.sharesTable.grantReadWriteData(this.approveShareFunction);
		this.sharesTable.grantReadData(this.emailNotificationFunction);

		this.sharesBucket.grantReadWrite(this.submitShareFunction);

		// Grant SES permissions for sending emails
		this.emailNotificationFunction.addToRolePolicy(
			new iam.PolicyStatement({
				effect: iam.Effect.ALLOW,
				actions: ['ses:SendEmail', 'ses:SendRawEmail'],
				resources: [
					`arn:aws:ses:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:identity/${domain}`,
					`arn:aws:ses:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:identity/shares@${domain}`,
				],
			})
		);

		// Trigger email notification after share submission
		this.submitShareFunction.addEnvironment('EMAIL_NOTIFICATION_FUNCTION_NAME', this.emailNotificationFunction.functionName);
		this.emailNotificationFunction.grantInvoke(this.submitShareFunction);

		// Add API Gateway routes
		this._addApiRoutes(api);
	}

	/**
	 * Adds API routes for the shares functionality
	 * @private
	 */
	_addApiRoutes(api) {
		// POST /share - Submit new share
		const shareResource = api.root.addResource('share');
		shareResource.addMethod('POST', new apigateway.LambdaIntegration(this.submitShareFunction));

		// GET /verify-email - Email verification callback
		const verifyEmailResource = api.root.addResource('verify-email');
		verifyEmailResource.addMethod('GET', new apigateway.LambdaIntegration(this.verifyEmailFunction));

		// GET /approve-share - Admin approval callback
		const approveShareResource = api.root.addResource('approve-share');
		approveShareResource.addMethod('GET', new apigateway.LambdaIntegration(this.approveShareFunction));
	}
}