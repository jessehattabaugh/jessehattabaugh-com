import { getUserById } from '../../shared/data/accounts.js';
import { createEmailVerification, deleteEmailVerification } from '../../shared/data/email-verification.js';
import { getSessionUser } from './session.js';
import { paths } from '../../shared/routes.js';
import { html } from '../../shared/html.js';
import { ServiceError } from '../http/request.js';

/** Only server-known app destinations can receive a successful sign-in.
 * @param {unknown} value
 */
export function returnTarget(value) {
	if (value === 'lightsfinder') { return paths.lightsfinder; }
	return [paths.home, paths.messages, paths.rainbow, paths.lightsfinder, paths.crunch].find((path) => { return path === value; }) ?? paths.messages;
}

/** @param {Request} request @param {import('../../shared/types.js').Env} env */
export async function sessionUser(request, env) {
	const id = await getSessionUser(request, env.SESSION_SECRET);
	const user = id ? await getUserById(env.DB, id) : null;
	// This release's host-only cookie is issued only after email or passkey proof.
	// Legacy passkey accounts can enroll a recovery email after signing in.
	return user;
}


/** @param {string} email */
export function validEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254; }

/**
 * Delivery failures are failures, never a misleading "check your inbox" success.
 * No raw binding errors are shown to the user; the outer Worker renders 500.
 * @param {import('../../shared/types.js').Env} env
 * @param {Request} request
 * @param {{ userId: string, email: string, purpose: string, message?: string, conversationId?: string, returnTo?: string, name: string }} data
 */
export async function emailVerification(env, request, data) {
	if (!env.EMAIL) { throw new ServiceError('EMAIL_BINDING_MISSING'); }
	if (!env.EMAIL_FROM) { throw new ServiceError('EMAIL_SENDER_MISSING'); }
	if (!env.SESSION_SECRET) { throw new ServiceError('SESSION_SECRET_MISSING'); }
	const token = crypto.randomUUID();
	await createEmailVerification(env.DB, {
		id: token, userId: data.userId, email: data.email, purpose: data.purpose,
		payload: JSON.stringify({ returnTo: returnTarget(data.returnTo) }),
		message: data.message && data.conversationId ? { id: crypto.randomUUID(), conversationId: data.conversationId, content: data.message } : undefined,
	});
	const link = new URL(paths.verify, request.url);
	link.searchParams.set('token', token);
	try {
		await env.EMAIL.send({
			to: data.email, from: env.EMAIL_FROM,
			subject: data.message ? 'Verify your email for Jessages' : 'Sign in to Jesse Hattabaugh’s apps',
			text: `Hi ${data.name},\n\nVerify your email to sign in to all apps, read replies, and notify Jesse of your message: ${link}\n\nThis link expires in 15 minutes and can be used once. Ignore it if you did not make this request.`,
			html: html`<p>Hi ${data.name},</p><p><a href="${link.toString()}">Confirm your email</a></p><p>This link expires in 15 minutes and can be used once. Ignore it if you did not make this request.</p>`.value,
		});
	} catch (error) {
		await deleteEmailVerification(env.DB, token);
		const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
		const known = ['E_SENDER_NOT_VERIFIED', 'E_SENDER_DOMAIN_NOT_AVAILABLE', 'E_RECIPIENT_NOT_ALLOWED', 'E_RECIPIENT_SUPPRESSED', 'E_VALIDATION_ERROR', 'E_FIELD_MISSING', 'E_UNVERIFIED_SENDER', 'E_INVALID_EMAIL', 'E_INVALID_ARGUMENT', 'E_DELIVERY_FAILED', 'E_RATE_LIMIT_EXCEEDED', 'E_DAILY_LIMIT_EXCEEDED', 'E_INTERNAL_SERVER_ERROR', 'E_UNAUTHORIZED', 'E_NOT_AUTHORIZED'];
		throw new ServiceError(known.includes(code) ? code : 'EMAIL_DELIVERY_FAILED', error);
	}
}

