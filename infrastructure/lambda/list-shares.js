import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/**
 * 📋 List Published Shares Lambda Handler
 * Returns published shares for the /shares page
 * 
 * @param {Object} event - API Gateway event
 * @returns {Object} HTTP response
 */
export async function handler() {
	console.log('📋🚀 Fetching published shares');

	try {
		// Query published shares using GSI
		const queryParameters = {
			TableName: process.env.SHARES_TABLE_NAME,
			IndexName: 'PublishedIndex',
			KeyConditionExpression: 'published = :published',
			ExpressionAttributeValues: {
				':published': 'true',
			},
			ScanIndexForward: false, // Sort by createdAt descending (newest first)
			Limit: 50, // Limit to 50 shares for performance
		};

		const { Items: shares } = await dynamoClient.send(new QueryCommand(queryParameters));

		console.info('📋📊 Found published shares:', shares?.length || 0);

		// Transform shares for frontend consumption
		const transformedShares = (shares || []).map(share => ({
			shareId: share.shareId,
			title: share.title,
			text: share.text,
			url: share.url,
			imagePath: share.imagePath,
			publishedAt: share.publishedAt || share.createdAt,
			// Mask email for privacy
			email: maskEmail(share.email),
		}));

		return {
			statusCode: 200,
			headers: { 
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
			},
			body: JSON.stringify({
				shares: transformedShares,
				count: transformedShares.length,
			}),
		};

	} catch (error) {
		console.error('📋💥 Error fetching shares:', error);
		return {
			statusCode: 500,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ error: 'Failed to fetch shares' }),
		};
	}
}

/**
 * Masks email address for privacy
 * @param {string} email - Original email address
 * @returns {string} Masked email address
 */
function maskEmail(email) {
	if (!email || !email.includes('@')) {
		return 'anonymous';
	}
	
	const [username, domain] = email.split('@');
	const maskedUsername = username.length > 2 
		? username.slice(0, 2) + '***'
		: username + '***';
	
	return `${maskedUsername}@${domain}`;
}