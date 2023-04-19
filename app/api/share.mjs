import arc from '@architect/functions';
import { v4 as uuid } from 'uuid';

/** @type {import('@enhance/types').EnhanceApiFn} */
export async function post(req) {
	const { session } = req;
	const { isAuthorized } = session;
	const { text, title, url } = req.body;
	if (text || title || url) {
		// send the share somewhere
		try {
			const db = await arc.tables();
			const shareId = uuid();
			const createdAt = Date.now();
			const result = await db.shares.put({
				createdAt,
				isAuthorized,
				shareId,
				text,
				title,
				url,
			});
			console.log('💌', 'share saved', result);
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
	} else {
		console.log('🌋', { text, title, url });
		return {
			session: { error: 'you have to share something' },
			location: '/share',
		};
	}
}

/** @type {import('@enhance/types').EnhanceApiFn} */
export async function get(req) {
	const { text, title, url } = req.query;
	const { error, isAuthorized } = req.session;
	return { json: { isAuthorized, text, title, url, error } };
}
