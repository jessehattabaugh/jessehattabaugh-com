#!/usr/bin/env node

/**
 * Jesse Hattabaugh Website CDK App
 *
 * Uses environment variables for certificate configuration.
 * Copy .env.example to .env and set your CERTIFICATE_ID.
 */

import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';

import { App } from 'aws-cdk-lib';
import { JesseHattabaughStack } from './infrastructure/jesse-hattabaugh-stack.js';
// Load environment variables from .env file
import dotenv from 'dotenv';
import { fromIni } from '@aws-sdk/credential-provider-ini';
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";

dotenv.config();

const app = new App();

// Get certificate ID from environment variable
const certificateId = process.env.CERTIFICATE_ID;
if (!certificateId) {
	throw new Error(
		'CERTIFICATE_ID environment variable is required. Copy .env.example to .env and set your certificate ID.'
	);
}

// Get account and region using AWS SDK
const getAwsInfo = async () => {
	const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
		let credentialsProvider;
	try {
		credentialsProvider = fromIni();
		await credentialsProvider();
	} catch (e) {
		credentialsProvider = fromNodeProviderChain();
	}
	const sts = new STSClient({ region, credentials: credentialsProvider });

	try {
		const identity = await sts.send(new GetCallerIdentityCommand({}));
		return { account: identity.Account, region };
	} catch (err) {
		throw new Error('Failed to retrieve AWS account ID: ' + err.message);
	}
};

const { account, region } = await getAwsInfo();

// Construct certificate ARN using account and region
const certificateArn = `arn:aws:acm:us-east-1:${account}:certificate/${certificateId}`;

// Create production stack
new JesseHattabaughStack(app, 'JesseHattabaughProdStack', {
	domain: 'jessehattabaugh.com',
	environment: 'production',
	certificateArn,
	crossRegionReferences: true,
	env: { account, region },
});

// Create staging stack
new JesseHattabaughStack(app, 'JesseHattabaughStagingStack', {
	domain: 'staging.jessehattabaugh.com',
	environment: 'staging',
	certificateArn,
	crossRegionReferences: true,
	env: { account, region }
});
