import arc from '@architect/functions';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import lms from 'lambda-multipart-parser';
import crypto from 'crypto';

/** @type {import('@enhance/types').EnhanceApiFn} */
export async function post(req) {
	const { session } = req;
	const { isAuthorized } = session;

	// @see https://begin.com/blog/posts/2023-02-08-upload-files-in-forms-part-1#decoding-the-multipart-form-data
	// @ts-ignore
	const form = await lms.parse({ ...req, body: req.rawBody });
	const { text, title, url } = form;
	console.log('💿', form.files);
	const [imageFile] = form.files;

	let image;
	if (imageFile) {
		const { content: Body, filename } = imageFile;
		image = `.shared/${crypto.randomUUID()}${filename}`;

		// upload the file to the architect static bucket
		const { ARC_STATIC_BUCKET: Bucket, AWS_REGION: region } = process.env;
		const client = new S3Client({ region });
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
	// console.log('🌋', req);
	return {
		session: { error: 'you have to share something' },
		location: '/share',
	};
}

/** @type {import('@enhance/types').EnhanceApiFn} */
export async function get(req) {
	const { text, title, url } = req.query;
	const { error, isAuthorized } = req.session;
	return { json: { isAuthorized, text, title, url, error } };
}
