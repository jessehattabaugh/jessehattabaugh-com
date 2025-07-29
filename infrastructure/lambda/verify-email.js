import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/**
 * ✅ Email Verification Lambda Handler
 * Handles email verification callback links
 * 
 * @param {Object} event - API Gateway event
 * @returns {Object} HTTP response
 */
export async function handler(event) {
	console.log('✅🚀 Processing email verification');

	try {
		const token = event.queryStringParameters?.token;

		if (!token) {
			console.warn('✅⚠️ Missing verification token');
			return {
				statusCode: 400,
				headers: { 'Content-Type': 'text/html' },
				body: `
					<!DOCTYPE html>
					<html>
						<head><title>Verification Error</title></head>
						<body>
							<h1>Verification Error</h1>
							<p>Invalid verification link. Please check your email for the correct link.</p>
						</body>
					</html>
				`,
			};
		}

		// Find share by verification token
		// For this implementation, let's assume the token IS the shareId for simplicity
		const shareId = token;
		
		try {
			const { Item: share } = await dynamoClient.send(new GetCommand({
				TableName: process.env.SHARES_TABLE_NAME,
				Key: { shareId },
			}));

			if (!share) {
				console.warn('✅⚠️ Share not found for token:', token);
				return {
					statusCode: 404,
					headers: { 'Content-Type': 'text/html' },
					body: `
						<!DOCTYPE html>
						<html>
							<head><title>Verification Error</title></head>
							<body>
								<h1>Verification Error</h1>
								<p>Share not found. The verification link may be invalid or expired.</p>
							</body>
						</html>
					`,
				};
			}

			if (share.emailVerified) {
				console.info('✅✨ Email already verified for share:', shareId);
				return {
					statusCode: 200,
					headers: { 'Content-Type': 'text/html' },
					body: `
						<!DOCTYPE html>
						<html>
							<head><title>Already Verified</title></head>
							<body>
								<h1>Email Already Verified</h1>
								<p>Your email has already been verified for this share. Thank you!</p>
								<p>Your share is pending admin approval.</p>
							</body>
						</html>
					`,
				};
			}

			// Update share to mark email as verified
			await dynamoClient.send(new UpdateCommand({
				TableName: process.env.SHARES_TABLE_NAME,
				Key: { shareId },
				UpdateExpression: 'SET emailVerified = :verified, verifiedAt = :verifiedAt',
				ExpressionAttributeValues: {
					':verified': true,
					':verifiedAt': new Date().toISOString(),
				},
			}));

			console.info('✅✨ Email verified successfully for share:', shareId);

			return {
				statusCode: 200,
				headers: { 'Content-Type': 'text/html' },
				body: `
					<!DOCTYPE html>
					<html>
						<head><title>Email Verified</title></head>
						<body>
							<h1>Email Verified Successfully!</h1>
							<p>Thank you for verifying your email address.</p>
							<p>Your share has been submitted and is pending admin approval.</p>
							<p>You will receive a notification when it's approved and published.</p>
						</body>
					</html>
				`,
			};

		} catch (error) {
			console.error('✅❌ Database operation failed:', error);
			return {
				statusCode: 500,
				headers: { 'Content-Type': 'text/html' },
				body: `
					<!DOCTYPE html>
					<html>
						<head><title>Verification Error</title></head>
						<body>
							<h1>Verification Error</h1>
							<p>An error occurred while verifying your email. Please try again later.</p>
						</body>
					</html>
				`,
			};
		}

	} catch (error) {
		console.error('✅💥 Unexpected error:', error);
		return {
			statusCode: 500,
			headers: { 'Content-Type': 'text/html' },
			body: `
				<!DOCTYPE html>
				<html>
					<head><title>Verification Error</title></head>
					<body>
						<h1>Verification Error</h1>
						<p>An unexpected error occurred. Please try again later.</p>
					</body>
				</html>
			`,
		};
	}
}