#!/usr/bin/env node

import 'source-map-support/register.js';

import * as cdk from 'aws-cdk-lib';

import { JesseHattabaughStack } from './infrastructure/jesse-hattabaugh-stack.js';

const app = new cdk.App();

new JesseHattabaughStack(app, 'JesseHattabaughStack', {
	env: {
		account: process.env.CDK_DEFAULT_ACCOUNT,
		region: process.env.CDK_DEFAULT_REGION,
	},
	domain: 'jessehattabaugh.com',
});
