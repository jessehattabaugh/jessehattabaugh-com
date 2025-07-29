import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/**
 * 👨‍💼 Admin Approval Lambda Handler
 * Handles admin approval callback links for publishing shares
 * 
 * @param {Object} event - API Gateway event
 * @returns {Object} HTTP response
 */
export async function handler(event) {
	console.log('👨‍💼🚀 Processing admin approval');

	try {
		const token = event.queryStringParameters?.token;

		if (!token) {
			console.warn('👨‍💼⚠️ Missing approval token');
			return {
				statusCode: 400,
				headers: { 'Content-Type': 'text/html' },
				body: `
					<!DOCTYPE html>
					<html>
						<head><title>Approval Error</title></head>
						<body>
							<h1>Approval Error</h1>
							<p>Invalid approval link. Please check your email for the correct link.</p>
						</body>
					</html>
				`,
			};
		}

		// Find share by approval token
		// For this implementation, let's assume the token IS the shareId for simplicity
		const shareId = token;
		
		try {
			const { Item: share } = await dynamoClient.send(new GetCommand({
				TableName: process.env.SHARES_TABLE_NAME,
				Key: { shareId },
			}));

			if (!share) {
				console.warn('👨‍💼⚠️ Share not found for token:', token);
				return {
					statusCode: 404,
					headers: { 'Content-Type': 'text/html' },
					body: `
						<!DOCTYPE html>
						<html>
							<head><title>Approval Error</title></head>
							<body>
								<h1>Approval Error</h1>
								<p>Share not found. The approval link may be invalid or expired.</p>
							</body>
						</html>
					`,
				};
			}

			if (!share.emailVerified) {
				console.warn('👨‍💼⚠️ Email not verified for share:', shareId);
				return {
					statusCode: 400,
					headers: { 'Content-Type': 'text/html' },
					body: `
						<!DOCTYPE html>
						<html>
							<head><title>Approval Error</title></head>
							<body>
								<h1>Approval Error</h1>
								<p>Cannot approve share: User email has not been verified yet.</p>
								<p>Share ID: ${shareId}</p>
							</body>
						</html>
					`,
				};
			}

			if (share.published) {
				console.info('👨‍💼✨ Share already published:', shareId);
				return {
					statusCode: 200,
					headers: { 'Content-Type': 'text/html' },
					body: `
						<!DOCTYPE html>
						<html>
							<head><title>Already Approved</title></head>
							<body>
								<h1>Share Already Approved</h1>
								<p>This share has already been approved and published.</p>
								<p>Share ID: ${shareId}</p>
								<p><a href="https://${process.env.DOMAIN}/shares">View Published Shares</a></p>
							</body>
						</html>
					`,
				};
			}

			// Update share to mark as published
			await dynamoClient.send(new UpdateCommand({
				TableName: process.env.SHARES_TABLE_NAME,
				Key: { shareId },
				UpdateExpression: 'SET published = :published, publishedAt = :publishedAt',
				ExpressionAttributeValues: {
					':published': true,
					':publishedAt': new Date().toISOString(),
				},
			}));

			console.info('👨‍💼✨ Share approved and published:', shareId);

			return {
				statusCode: 200,
				headers: { 'Content-Type': 'text/html' },
				body: `
					<!DOCTYPE html>
					<html>
						<head><title>Share Approved</title></head>
						<body>
							<h1>Share Approved Successfully!</h1>
							<p>The share has been approved and is now published.</p>
							<p>Share ID: ${shareId}</p>
							<p>Title: "${share.title}"</p>
							<p>Submitted by: ${share.email}</p>
							<p><a href="https://${process.env.DOMAIN}/shares">View All Published Shares</a></p>
						</body>
					</html>
				`,
			};

		} catch (error) {
			console.error('👨‍💼❌ Database operation failed:', error);
			return {
				statusCode: 500,
				headers: { 'Content-Type': 'text/html' },
				body: `
					<!DOCTYPE html>
					<html>
						<head><title>Approval Error</title></head>
						<body>
							<h1>Approval Error</h1>
							<p>An error occurred while approving the share. Please try again later.</p>
						</body>
					</html>
				`,
			};
		}

	} catch (error) {
		console.error('👨‍💼💥 Unexpected error:', error);
		return {
			statusCode: 500,
			headers: { 'Content-Type': 'text/html' },
			body: `
				<!DOCTYPE html>
				<html>
					<head><title>Approval Error</title></head>
					<body>
						<h1>Approval Error</h1>
						<p>An unexpected error occurred. Please try again later.</p>
					</body>
				</html>
			`,
		};
	}
}