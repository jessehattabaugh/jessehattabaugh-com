#!/usr/bin/env node

/**
 * Jesse Hattabaugh Website CDK App
 * 
 * Uses environment variables for certificate configuration.
 * Copy .env.example to .env and set your CERTIFICATE_ID.
 */

import { App } from 'aws-cdk-lib';
import { JesseHattabaughStack } from './infrastructure/jesse-hattabaugh-stack.js';
// Load environment variables from .env file
import dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config();


const app = new App();

// Get certificate ID from environment variable
const certificateId = process.env.CERTIFICATE_ID;
if (!certificateId) {
	throw new Error(
		'CERTIFICATE_ID environment variable is required. Copy .env.example to .env and set your certificate ID.'
	);
}

// Get account and region from AWS CLI
const account = execSync('aws sts get-caller-identity --query Account --output text', { encoding: 'utf8' }).trim();
const region = execSync('aws configure get region', { encoding: 'utf8' }).trim() || 'us-east-1';

// Construct certificate ARN using account from CDK context
const certificateArn = `arn:aws:acm:us-east-1:${account}:certificate/${certificateId}`;

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
