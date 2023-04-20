import crypto from 'crypto';

import arc from '@architect/functions';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import lms from 'lambda-multipart-parser';

/** @type {import('@enhance/types').EnhanceApiFn} */
export async function post(req) {
	const { session } = req;
	const { isAuthorized } = session;

	// @see https://begin.com/blog/posts/2023-02-08-upload-files-in-forms-part-1#decoding-the-multipart-form-data
	// @ts-ignore
	const form = await lms.parse({ ...req, body: req.rawBody });
	const { text, title, url } = form;
	const [image] = form.files;

	if (text || title || url || image) {
		try {
			const db = await arc.tables();
			const shareId = crypto.randomUUID();
			const createdAt = Date.now();

			let imageKey;
			if (image) {
				console.log('💿', image);
				const { content: Body, filename } = image;
				const { ARC_STATIC_BUCKET: Bucket, AWS_REGION: region } = process.env;
				imageKey = `.shared/${shareId}/${filename}`;
				const client = new S3Client({ region });
				const params = { Bucket, Key: imageKey, Body };
				const command = new PutObjectCommand(params);
				await client.send(command);
			}

			const result = await db.shares.put({
				createdAt,
				image: imageKey,
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
