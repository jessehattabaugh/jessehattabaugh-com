import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3Client = new S3Client({});
const lambdaClient = new LambdaClient({});

/**
 * 📤 Submit Share Lambda Handler
 * Handles new share submissions with image upload and email workflow initiation
 * 
 * @param {Object} event - API Gateway event
 * @returns {Object} HTTP response
 */
export async function handler(event) {
	console.log('📤🚀 Processing share submission');

	try {
		// Parse request body
		let body;
		try {
			body = JSON.parse(event.body || '{}');
		} catch (error) {
			console.error('📤❌ Invalid JSON in request body:', error);
			return {
				statusCode: 400,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ error: 'Invalid JSON format' }),
			};
		}

		const { email, title, text, url, imageData, imageType } = body;

		// Validate required fields
		if (!email || !title || !text) {
			console.warn('📤⚠️ Missing required fields');
			return {
				statusCode: 400,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					error: 'Missing required fields', 
					required: ['email', 'title', 'text'] 
				}),
			};
		}

		// Generate unique IDs and tokens
		const shareId = randomUUID();
		const verificationToken = randomUUID();
		const approvalToken = randomUUID();
		const createdAt = new Date().toISOString();

		let imagePath;

		// Handle image upload if provided
		if (imageData && imageType) {
			try {
				const imageKey = `shares/${shareId}.${imageType.split('/')[1]}`;
				const imageBuffer = Buffer.from(imageData, 'base64');

				await s3Client.send(new PutObjectCommand({
					Bucket: process.env.SHARES_BUCKET_NAME,
					Key: imageKey,
					Body: imageBuffer,
					ContentType: imageType,
					ACL: 'public-read',
				}));

				imagePath = imageKey;
				console.info('📤📷 Image uploaded successfully:', imageKey);
			} catch (error) {
				console.error('📤❌ Image upload failed:', error);
				return {
					statusCode: 500,
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ error: 'Image upload failed' }),
				};
			}
		}

		// Save share data to DynamoDB
		const shareItem = {
			shareId,
			email,
			title,
			text,
			url: url || '',
			imagePath,
			emailVerified: false,
			published: false,
			createdAt,
			verificationToken,
			approvalToken,
		};

		try {
			await dynamoClient.send(new PutCommand({
				TableName: process.env.SHARES_TABLE_NAME,
				Item: shareItem,
			}));
			console.info('📤💾 Share saved to database:', shareId);
		} catch (error) {
			console.error('📤❌ Database save failed:', error);
			return {
				statusCode: 500,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ error: 'Failed to save share' }),
			};
		}

		// Trigger email notification workflow
		try {
			await lambdaClient.send(new InvokeCommand({
				FunctionName: process.env.EMAIL_NOTIFICATION_FUNCTION_NAME,
				InvocationType: 'Event', // Async invocation
				Payload: JSON.stringify({
					type: 'verification',
					shareId,
					email,
					title,
					verificationToken,
					approvalToken,
				}),
			}));
			console.info('📤📧 Email notification triggered');
		} catch (error) {
			console.error('📤❌ Email notification failed:', error);
			// Don't fail the request, just log the error
		}

		return {
			statusCode: 201,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ 
				message: 'Share submitted successfully',
				shareId 
			}),
		};

	} catch (error) {
		console.error('📤💥 Unexpected error:', error);
		return {
			statusCode: 500,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ error: 'Internal server error' }),
		};
	}
}