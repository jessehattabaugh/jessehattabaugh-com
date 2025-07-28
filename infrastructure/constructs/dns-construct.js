import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';

import { Construct } from 'constructs';

/**
 * Properties for the DNS construct
 * @typedef {Object} DnsConstructProps
 * @property {string} domain - The domain name
 * @property {string} rootDomain - The root domain for hosted zone lookup
 * @property {boolean} isProduction - Whether this is production environment
 * @property {import('aws-cdk-lib/aws-cloudfront').Distribution} [distribution] - CloudFront distribution to point to
 * @property {import('aws-cdk-lib/aws-apigateway').RestApi} [api] - API Gateway to point to (fallback if no distribution)
 */

/**
 * DNS Construct - Manages Route53 records for the website
 * This construct handles A records for apex and www subdomains
 */
export class DnsConstruct extends Construct {
	constructor(scope, id, properties) {
		super(scope, id);

		const { domain, rootDomain, isProduction, distribution, api } = properties;

		// Route53 hosted zone lookup (environment agnostic)
		this.hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
			domainName: rootDomain,
		});

		// Determine target based on what's available
		const target = distribution
			? route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution))
			: route53.RecordTarget.fromAlias(new targets.ApiGateway(api));

		// Create A records with proper naming
		const recordName = isProduction ? undefined : 'staging';

		this.aliasRecord = new route53.ARecord(this, 'AliasRecord', {
			zone: this.hostedZone,
			recordName,
			target,
			comment: `A record for ${domain}`,
		});

		// Only create www record for production
		if (isProduction) {
			this.wwwAliasRecord = new route53.ARecord(this, 'WwwAliasRecord', {
				zone: this.hostedZone,
				recordName: 'www',
				target,
				comment: `WWW A record for ${domain}`,
			});
		}
	}
}
