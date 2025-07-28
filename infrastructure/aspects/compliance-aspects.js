import { Annotations, TagManager } from 'aws-cdk-lib';

import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';

/**
 * Aspect that applies mandatory tags to all resources
 * Implements "Tags everywhere" guideline with consistent tagging strategy
 */
export class MandatoryTagsAspect {
	constructor(tags) {
		this.tags = tags;
	}

	/**
	 * Apply tags to all constructs in the scope
	 * @param {import('constructs').IConstruct} node - The construct node to apply tags to
	 */
	visit(node) {
		// Apply tags to all taggable resources
		if (TagManager.isTaggable(node)) {
			for (const [key, value] of Object.entries(this.tags)) {
				node.tags.setTag(key, value, 100); // Priority 100 for mandatory tags
			}
		}

		// Add informational annotation
		if (node.node.id && !node.node.id.startsWith('AWS')) {
			Annotations.of(node).addInfo(
				`Applied mandatory tags: ${Object.keys(this.tags).join(', ')}`
			);
		}
	}
}

/**
 * Aspect that enforces security best practices
 * Implements "Security by default" guideline
 */
export class SecurityAspect {
	/**
	 * Applies security checks to AWS S3 buckets and Lambda functions.
	 * For S3 buckets, checks for encryption and public access block settings.
	 * For Lambda functions, checks for environment variables that may contain secrets.
	 * Adds warnings via CDK Annotations if security best practices are not met.
	 * @param {import('constructs').IConstruct} node - The construct node to check.
	 * @returns {void}
	 */
	visit(node) {
		// Check S3 buckets for security settings
		if (node instanceof Bucket) {
			this._checkS3Security(node);
		}

		// Check Lambda functions for security settings
		if (node instanceof LambdaFunction) {
			this._checkLambdaSecurity(node);
		}
	}

	/**
	 * Check S3 bucket security configuration
	 * @private
	 */
	_checkS3Security(bucket) {
		const bucketNode = bucket.node;

		// Check if encryption is enabled
		const encryptionConfig = bucketNode.tryFindChild('Policy');
		if (!encryptionConfig) {
			Annotations.of(bucket).addWarning('S3 bucket should have encryption enabled');
		}

		// Check if public access is blocked
		const publicAccessBlock = bucketNode.tryFindChild('PublicAccessBlockConfiguration');
		if (!publicAccessBlock) {
			Annotations.of(bucket).addWarning('S3 bucket should block public access');
		}
	}

	/**
	 * Check Lambda function security configuration
	 * @private
	 */
	_checkLambdaSecurity(lambdaFunction) {
		// Check for environment variables that might contain secrets
		const environmentVariables = lambdaFunction.environment || {};
		for (const key of Object.keys(environmentVariables)) {
			if (key.toLowerCase().includes('secret') || key.toLowerCase().includes('password')) {
				Annotations.of(lambdaFunction).addWarning(
					`Environment variable '${key}' might contain secrets. Consider using AWS Secrets Manager.`
				);
			}
		}
	}
}
