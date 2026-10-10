import { getConversation, getPushSubscriptionsByUser, getOwnerPushSubscriptions, deletePushSubscription } from '../shared/data/messages.js';
import { notifyAll } from './vapid.js';
import { paths } from '../shared/routes.js';

/** @param {import('../shared/types.js').Env} env @param {{ conversationId: string, senderIsOwner: boolean, senderName: string, content: string }} data */
export async function notifyNewMessage(env, data) {
	if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) { return; }
	const conversation = await getConversation(env.DB, data.conversationId);
	if (!conversation) { return; }
	const subscriptions = data.senderIsOwner
		? await getPushSubscriptionsByUser(env.DB, String(conversation.visitor_user_id))
		: await getOwnerPushSubscriptions(env.DB);
	await notifyAll(subscriptions, {
		vapidPublicKey: env.VAPID_PUBLIC_KEY, vapidPrivateKey: env.VAPID_PRIVATE_KEY,
		vapidContact: env.VAPID_CONTACT ?? 'mailto:jesse@jessehattabaugh.com',
	}, (endpoint) => {return deletePushSubscription(env.DB, endpoint)}, JSON.stringify({
		// Push carries a preview, not the full stored message. Bound both text
		// fields (including legacy display names), preserving Unicode code points
		// so JSON + UTF-8 + encryption overhead fit the single Web Push record.
		senderName: Array.from(data.senderName).slice(0, 100).join(''),
		content: Array.from(data.content).slice(0, 200).join(''),
		url: `${paths.messages}?conversationId=${encodeURIComponent(data.conversationId)}`,
	}));
}

