#!/usr/bin/env node

/**
 * Jesse Hattabaugh Website CDK App
 * 
 * Uses environment variables for certificate configuration.
 * Copy .env.example to .env and set your CERTIFICATE_ARN.
 */

import { App } from 'aws-cdk-lib';
import { JesseHattabaughStack } from './infrastructure/jesse-hattabaugh-stack.js';

const app = new App();

// Get certificate ID from environment variable
const certificateId = process.env.CERTIFICATE_ID;
if (!certificateId) {
	throw new Error(
		'CERTIFICATE_ID environment variable is required. Copy .env.example to .env and set your certificate ID.'
	);
}

// Validate certificate ID format (must be a UUID)
const certificateIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!certificateIdPattern.test(certificateId)) {
	throw new Error(
		'CERTIFICATE_ID does not appear to be a valid AWS ACM certificate ID (UUID format required).'
	);
}

// Get AWS account and region from environment variables
const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION || 'us-east-1';

if (!account) {
	throw new Error(
		'CDK_DEFAULT_ACCOUNT environment variable is required. Set it to your AWS account ID.'
	);
}

const certificateArn = `arn:aws:acm:${region}:${account}:certificate/${certificateId}`;

// Create production stack
new JesseHattabaughStack(app, 'JesseHattabaughProdStack', {
	domain: 'jessehattabaugh.com',
	environment: 'production',
	certificateArn,
	crossRegionReferences: true,
	env: { account, region }
})

// Create staging stack  
new JesseHattabaughStack(app, 'JesseHattabaughStagingStack', {
	domain: 'staging.jessehattabaugh.com',
	environment: 'staging',
	certificateArn,
	crossRegionReferences: true,
	env: { account, region }
});
