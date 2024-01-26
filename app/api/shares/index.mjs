import arc from '@architect/functions';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import lms from 'lambda-multipart-parser';
import crypto from 'crypto';

/** load shares from db
 * @type {import('@enhance/types').EnhanceApiFn} */
export async function get(request) {
	const { session } = request;
	const { isAuthorized, error } = session;
	const Limit = 100;
	const options = isAuthorized
		? { Limit }
		: {
				ExpressionAttributeValues: { ':true': true },
				FilterExpression: 'isAuthorized = :true',
				Limit,
				ScanIndexForward: false, // reverse createdAt order
		  };
	try {
		const db = await arc.tables();
		const result = await db.shares.scan(options);
		const { Items: shares } = result;
		return { json: { error, isAuthorized, shares } };
	} catch (error) {
		console.error('🛟 error loading shares', error);
		return { json: { error } };
	}
}

/** add a share
 * @type {import('@enhance/types').EnhanceApiFn} */
export async function post(request) {
	const { session } = request;
	const { isAuthorized = false } = session;

	// @see https://begin.com/blog/posts/2023-02-08-upload-files-in-forms-part-1#decoding-the-multipart-form-data
	// @ts-ignore - EnhanceAPIRequest doesn't match APIGAtewayProxyEvent
	const form = await lms.parse({ ...request, body: request.rawBody });
	const { text = '', title = '', url = '' } = form;
	console.debug('💿 files', form.files);
	const [imageFile] = form.files;

	let image = '';
	if (imageFile) {
		const { content: Body, filename } = imageFile;
		image = 'images/' + crypto.randomUUID() + filename;

		// upload the file to the architect static bucket
		const { ARC_STATIC_BUCKET: Bucket, AWS_REGION: region } = process.env;
		const client = new S3Client({ region });
		//console.log('🍄', { Bucket, Key: image, Body });
		const command = new PutObjectCommand({ Bucket, Key: image, Body });
		await client.send(command);
	}

	if (image || text || title || url) {
		try {
			const db = await arc.tables();
			const shareId = crypto.randomUUID();
			const createdAt = Date.now();

			const result = await db.shares.put({
				createdAt,
				image,
				isAuthorized,
				shareId,
				text,
				title,
				url,
			});

			console.log('💌 share saved', result);

			return {
				location: '/thanks',
			};
		} catch (error) {
			console.error(`📢`, error);
			return {
				session: { error },
				location: '/share',
			};
		}
	}
	// console.log('🌋', request);
	return {
		session: { error: 'you have to share something' },
		location: '/share',
	};
}
