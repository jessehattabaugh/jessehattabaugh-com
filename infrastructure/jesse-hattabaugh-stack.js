import * as cdk from 'aws-cdk-lib';

import { MandatoryTagsAspect, SecurityAspect } from './aspects/compliance-aspects.js';

import { Aspects } from 'aws-cdk-lib';
import { DnsConstruct } from './constructs/dns-construct.js';
import { SharesConstruct } from './constructs/shares-construct.js';
import { WebsiteConstruct } from './constructs/website-construct.js';

/**
 * Jesse Hattabaugh Website Stack
 *
 * This stack follows CDK best practices:
 * - Modular constructs for logical separation
 * - Environment agnostic code with parameterization
 * - Security by default
 * - Mandatory tagging via Aspects
 * - Explicit RemovalPolicies
 * - Proper documentation
 */
export class JesseHattabaughStack extends cdk.Stack {
	constructor(scope, id, properties) {
		super(scope, id, properties);

		const { domain, environment, certificateArn, skipCloudFront = false } = properties;
		const isProduction = environment === 'production';

		// Apply mandatory tags via Aspects (cross-cutting concern)
		const mandatoryTags = {
			Environment: environment,
			Project: 'JesseHattabaughWebsite',
			Owner: 'jesse@jessehattabaugh.com',
			CostCenter: 'Personal',
			ManagedBy: 'CDK',
			StackName: this.stackName,
		};

		Aspects.of(this).add(new MandatoryTagsAspect(mandatoryTags));
		Aspects.of(this).add(new SecurityAspect());

		// Website infrastructure construct (logical unit)
		this.website = new WebsiteConstruct(this, 'Website', {
			environment,
			domain,
			certificateArn: skipCloudFront ? undefined : certificateArn,
			skipCloudFront,
		});

		// Shares functionality construct (logical unit)
		this.shares = new SharesConstruct(this, 'Shares', {
			environment,
			domain,
			api: this.website.api,
		});

		// DNS management construct (logical unit)
		if (!skipCloudFront) {
			const rootDomain = isProduction ? domain : 'jessehattabaugh.com';
			this.dns = new DnsConstruct(this, 'DNS', {
				domain,
				rootDomain,
				isProduction,
				distribution: this.website.distribution,
				api: this.website.api,
			});
		}

		// Stack outputs with proper descriptions
		this._createOutputs(environment, skipCloudFront);
	}

	/**
	 * Create CloudFormation outputs
	 * @private
	 */
	_createOutputs(environment, skipCloudFront) {
		new cdk.CfnOutput(this, 'Environment', {
			value: environment,
			description: 'Deployment environment',
			exportName: `${this.stackName}-Environment`,
		});

		new cdk.CfnOutput(this, 'DiscoveredPages', {
			value: JSON.stringify(this.website.pages.map((page) => page.route)),
			description: 'Automatically discovered page routes',
			exportName: `${this.stackName}-Pages`,
		});

		new cdk.CfnOutput(this, 'ApiGatewayUrl', {
			value: this.website.api.url,
			description: 'API Gateway URL',
			exportName: `${this.stackName}-ApiUrl`,
		});

		if (!skipCloudFront && this.website.distribution) {
			new cdk.CfnOutput(this, 'CloudFrontUrl', {
				value: `https://${this.website.distribution.distributionDomainName}`,
				description: 'CloudFront distribution URL',
				exportName: `${this.stackName}-CloudFrontUrl`,
			});

			new cdk.CfnOutput(this, 'WebsiteUrl', {
				value: `https://${
					this.website.domain ||
					this.website.api.restApiId + '.execute-api.' + this.region + '.amazonaws.com'
				}`,
				description: 'Website URL',
				exportName: `${this.stackName}-WebsiteUrl`,
			});
		} else {
			new cdk.CfnOutput(this, 'WebsiteUrl', {
				value: this.website.api.url,
				description: 'Website URL (API Gateway direct - no CloudFront)',
				exportName: `${this.stackName}-WebsiteUrl`,
			});
		}

		new cdk.CfnOutput(this, 'StaticBucketName', {
			value: this.website.staticBucket.bucketName,
			description: 'S3 bucket name for static assets',
			exportName: `${this.stackName}-StaticBucket`,
		});

		new cdk.CfnOutput(this, 'SkipCloudFront', {
			value: skipCloudFront.toString(),
			description: 'Whether CloudFront was skipped for this deployment',
			exportName: `${this.stackName}-SkipCloudFront`,
		});
	}
}
