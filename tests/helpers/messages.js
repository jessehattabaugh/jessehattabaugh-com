import { test as base, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { previewDatabase } from './database.js';
import { pendingVerification, deleteFixtureUser } from './fixtures.js';
import { createUser, getUserByEmailAny, markEmailVerified } from '../../shared/data/accounts.js';
import { getOrCreateConversation, createMessage } from '../../apps/messages/data.js';
import { createEmailVerification } from '../../shared/data/email-verification.js';

/**
 * Routine tests seed account/proof records in isolated preview D1. Only the
 * opt-in email suite sends through the real binding; it reads tokens from D1
 * and validates binding acceptance and confirmation, not inbox deliverability.
 */
export const test = base.extend({
	// Playwright discovers fixture dependencies from a destructured parameter.
	// eslint-disable-next-line no-empty-pattern
	identities: async ({}, use) => {
		const emails = [];
		const domain = process.env.E2E_EMAIL_DOMAIN || 'example.invalid';
		if (process.env.E2E_EMAIL_FLOW === '1' && !process.env.E2E_EMAIL_DOMAIN) { throw new Error('Email delivery tests require E2E_EMAIL_DOMAIN set to a controlled catch-all mailbox domain.'); }
		try { await use({
			create() {
				const email = `e2e-${randomUUID()}@${domain}`;
				emails.push(email);
				return { name: `Visitor ${randomUUID()}`, email };
			},
			async owner() {
				const email = `e2e-${randomUUID()}@${domain}`;
				emails.push(email);
				const identity = { name: `Owner ${randomUUID()}`, email };
				const db = await previewDatabase();
				const id = randomUUID();
				await createUser(db, { id, displayName: identity.name, email, isOwner: true });
				await markEmailVerified(db, id);
				return identity;
			},
		}); } finally {
			const db = await previewDatabase();
			await Promise.all(
				emails.map((email) => {
					return deleteFixtureUser(db, email);
				}),
			);
		}
	},
});
export { expect };

/** @param {import('@playwright/test').Page} page @param {string} email */
export async function confirmationLink(page, email) {
	const db = await previewDatabase();
	let token;
	await expect.poll(async () => {
		token = await pendingVerification(db, email);
		return !!token;
	}, { timeout: 15000 }).toBe(true);
	const link = new URL('/verify', page.url());
	link.searchParams.set('token', token.id);
	return link.toString();
}

/** @param {import('@playwright/test').Page} page @param {{ name: string, email: string }} identity */
export async function emailSignIn(page, identity) {
	if (process.env.E2E_EMAIL_FLOW !== '1') { throw new Error('Real email delivery requires E2E_EMAIL_FLOW=1.'); }
	await page.goto('/login');
	await page.getByLabel('Name', { exact: true }).fill(identity.name);
	await page.getByLabel('Email', { exact: true }).fill(identity.email);
	const [response] = await Promise.all([
		page.waitForResponse((response) => { return new URL(response.url()).pathname === '/login' && response.request().method() === 'POST'; }),
		page.getByRole('button', { name: 'Email me a sign-in link', exact: true }).click(),
	]);
	if (response.status() >= 400) {
		throw new Error(`Email sign-in failed: HTTP ${response.status()}, service code ${response.headers()['x-preview-service-error'] ?? 'unavailable'}.`);
	}
	await expect(page.getByRole('status').filter({ hasText: 'Check your email' })).toBeVisible();
	await page.goto(await confirmationLink(page, identity.email));
	await page.getByRole('button', { name: 'Confirm email', exact: true }).click();
	await expect(page.getByText(`Signed in as ${identity.name}.`, { exact: true })).toBeVisible();
	await page.waitForLoadState('load');
}

/** Routine tests seed a real D1 proof and confirm it through the root form.
 * The deployed Worker issues the signed session; no email is sent.
 * @param {import('@playwright/test').Page} page
 * @param {{name: string, email: string}} identity
 */
export async function signIn(page, identity) {
	const db = await previewDatabase();
	let user = await getUserByEmailAny(db, identity.email);
	if (!user) {
		await createUser(db, { id: randomUUID(), displayName: identity.name, email: identity.email });
		user = await getUserByEmailAny(db, identity.email);
	}
	if (!user) { throw new Error('Fixture account missing'); }
	const token = randomUUID();
	await createEmailVerification(db, { id: token, userId: user.id, email: identity.email, purpose: 'login' });
	const link = new URL('/verify', process.env.PREVIEW_URL);
	link.searchParams.set('token', token);
	await page.goto(link.toString());
	await page.getByRole('button', { name: 'Confirm email', exact: true }).click();
	await expect(page.getByText(`Signed in as ${identity.name}.`, { exact: true })).toBeVisible();
	await page.waitForLoadState('load');
}

/** A pending proof is fixture data; browser confirmation still uses the real
 * root route and D1 transaction. Delivery itself belongs to the opt-in suite.
 * @param {import('@playwright/test').Page} page
 * @param {{name: string, email: string}} identity
 * @param {string} message
 */
export async function pendingMessage(page, identity, message) {
	const db = await previewDatabase();
	const userId = randomUUID();
	const token = randomUUID();
	await createUser(db, { id: userId, displayName: identity.name, email: identity.email });
	const conversation = await getOrCreateConversation(db, userId);
	await createEmailVerification(db, { id: token, userId, email: identity.email, purpose: 'guest-message' });
	await createMessage(db, { id: randomUUID(), conversationId: conversation.id, senderUserId: userId, content: message, verified: false, verificationId: token });
	const link = new URL('/verify', process.env.PREVIEW_URL);
	link.searchParams.set('token', token);
	return link.toString();
}
