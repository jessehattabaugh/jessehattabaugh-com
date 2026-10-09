import { test as base, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { previewDatabase } from './database.js';
import { pendingVerification, deleteFixtureUser } from '../../shared/data/fixtures.js';
import { createUser, markEmailVerified } from '../../shared/data/messages.js';

/**
 * Emails are sent through the real binding. The test reads the genuine token
 * from this branch's D1 rather than replacing delivery or an authentication API.
 * This validates binding acceptance and confirmation, not inbox deliverability.
 */
export const test = base.extend({
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
	const link = new URL('/apps/messages/verify', page.url());
	link.searchParams.set('token', token.id);
	return link.toString();
}

/** @param {import('@playwright/test').Page} page @param {{ name: string, email: string }} identity */
export async function signIn(page, identity) {
	await page.goto('/login');
	await page.getByLabel('Name', { exact: true }).fill(identity.name);
	await page.getByLabel('Email', { exact: true }).fill(identity.email);
	const [response] = await Promise.all([
		page.waitForResponse((response) => new URL(response.url()).pathname === '/login' && response.request().method() === 'POST'),
		page.getByRole('button', { name: 'Email me a sign-in link', exact: true }).click(),
	]);
	if (response.status() >= 400) {
		throw new Error(`Email sign-in failed: HTTP ${response.status()}, service code ${response.headers()['x-preview-service-error'] ?? 'unavailable'}.`);
	}
	await expect(page.getByRole('status').filter({ hasText: 'Check your email' })).toBeVisible();
	await page.goto(await confirmationLink(page, identity.email));
	await page.getByRole('button', { name: 'Confirm email', exact: true }).click();
	await expect(page.getByText(`Signed in as ${identity.name}.`, { exact: true })).toBeVisible();
}
