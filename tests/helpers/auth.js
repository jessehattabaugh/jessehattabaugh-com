import { test as base, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { previewDatabase } from './database.js';
import { pendingVerification, deleteFixtureUser } from '../../shared/data/fixtures.js';
import { createUser, markEmailVerified, getUserByEmailAny, createEmailVerification } from '../../shared/data/auth.js';
import { paths } from '../../shared/routes.js';
import { reserveEmailDelivery, DAILY_EMAIL_TEST_LIMIT } from './email-budget.js';

/**
 * Ordinary tests seed real preview verification records, then confirm through
 * the browser. Only @email tests request actual delivery; no session cookies,
 * browser APIs or server responses are forged.
 */
export const test = base.extend({
	// Every @email scenario requests exactly one delivery; retries reserve again.
	// eslint-disable-next-line no-empty-pattern
	emailDeliveryBudget: [async ({}, use, testInfo) => {
		if (testInfo.tags.includes('@email')) {
			test.skip(process.env.E2E_SEND_EMAIL !== '1', 'Live email delivery is opt-in: E2E_SEND_EMAIL=1 npm test --grep @email');
			test.skip(!(await reserveEmailDelivery()), `Daily live-email test budget exhausted (${DAILY_EMAIL_TEST_LIMIT} attempts per account on this machine).`);
		}
		await use();
	}, { auto: true }],
	// Playwright discovers fixture dependencies from a destructured parameter.
	// eslint-disable-next-line no-empty-pattern
	identities: async ({}, use) => {
		const emails = [];
		const domain = process.env.E2E_EMAIL_DOMAIN;
		if (!domain) { throw new Error('Set E2E_EMAIL_DOMAIN to a controlled catch-all test mailbox domain.'); }
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

/**
 * Fixture precondition for tests of confirmation or already-authenticated use.
 * The real server consumes proof and signs the session in the browser.
 * @param {import('@playwright/test').Page} page
 * @param {{ name: string, email: string }} identity
 * @param {{ returnTo?: string, message?: string }} [options]
 */
export async function fixtureConfirmationLink(page, identity, { returnTo = paths.messages, message } = {}) {
	const db = await previewDatabase();
	const user = await getUserByEmailAny(db, identity.email);
	const userId = user?.id ?? randomUUID();
	if (!user) {
		await createUser(db, { id: userId, displayName: identity.name, email: identity.email });
	}
	const token = randomUUID();
	await createEmailVerification(db, {
		id: token, userId, email: identity.email,
		purpose: message === undefined ? 'login' : 'guest-message',
		payload: JSON.stringify({ name: identity.name, message, returnTo }),
	});
	const link = new URL(paths.verify, process.env.PREVIEW_URL);
	link.searchParams.set('token', token);
	return link.toString();
}

/** @param {import('@playwright/test').Page} page @param {{ name: string, email: string }} identity */
export async function signIn(page, identity) {
	await page.goto(await fixtureConfirmationLink(page, identity));
	await page.getByRole('button', { name: 'Confirm email', exact: true }).click();
	await expect(page.getByText(`Signed in as ${identity.name}.`, { exact: true })).toBeVisible();
}
