#!/usr/bin/env node

/**
 * Jesse Hattabaugh Website CDK App
 * 
 * This app follows CDK best practices:
 * - Environment agnostic code via context
 * - No hard-coded ARNs (uses context/environment variables)
 * - Deterministic deployments
 * - Proper environment handling
 */

import * as cdk from 'aws-cdk-lib';

import { JesseHattabaughStack } from './infrastructure/jesse-hattabaugh-stack.js';

const app = new cdk.App();

// Environment agnostic configuration
const environment = app.node.tryGetContext('environment') || 'staging';
const isProduction = environment === 'production';

// Configure domains based on environment (no hard-coding)
const domain = isProduction ? 'jessehattabaugh.com' : 'staging.jessehattabaugh.com';
const stackName = isProduction ? 'JesseHattabaughProdStack' : 'JesseHattabaughStagingStack';

// Get certificate ARN from context (environment agnostic)
const certificateArn = app.node.tryGetContext('certificates')?.[environment] || 
	app.node.tryGetContext('certificateArn') ||
	process.env[`CERTIFICATE_ARN_${environment.toUpperCase()}`];

// Validate required configuration
if (!certificateArn && !app.node.tryGetContext('skipCloudFront')) {
	throw new Error(
		`Certificate ARN is required for ${environment} environment. ` +
		`Set it in cdk.json context or CDK_CERTIFICATE_ARN_${environment.toUpperCase()} environment variable.`
	);
}

// Development mode flags for faster deployments
const developmentMode = app.node.tryGetContext('developmentMode') || false;
const skipCloudFront = app.node.tryGetContext('skipCloudFront') || developmentMode;

// Environment detection from CDK environment variables or AWS CLI
const env = {
	account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID,
	region: process.env.CDK_DEFAULT_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
};

// Create the stack with proper environment configuration
new JesseHattabaughStack(app, stackName, {
	env,
	domain,
	environment,
	certificateArn,
	skipCloudFront,
	description: `Jesse Hattabaugh Website Stack for ${environment} environment`,
	terminationProtection: isProduction, // Protect production stack from accidental deletion
});
