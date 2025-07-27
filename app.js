#!/usr/bin/env node

import 'source-map-support/register.js';

import * as cdk from 'aws-cdk-lib';

import { JesseHattabaughStack } from './infrastructure/jesse-hattabaugh-stack.js';

const app = new cdk.App();

// Get the environment from context or default to staging
const environment = app.node.tryGetContext('environment') || 'staging';
const isProduction = environment === 'production';

// Configure domains based on environment
const domain = isProduction ? 'jessehattabaugh.com' : 'staging.jessehattabaugh.com';
const stackName = isProduction ? 'JesseHattabaughProdStack' : 'JesseHattabaughStagingStack';

new JesseHattabaughStack(app, stackName, {
	env: {
		account: process.env.CDK_DEFAULT_ACCOUNT,
		region: process.env.CDK_DEFAULT_REGION,
	},
	domain,
	environment,
});
