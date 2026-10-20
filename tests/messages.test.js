import { randomUUID } from 'node:crypto';
import { test, expect, signIn, pendingMessage } from './helpers/messages.js';
import { previewDatabase } from './helpers/database.js';
import { failFixtureMessage } from '../shared/data/fixtures.js';

test('an owner selects a conversation and replies; the visitor reads it', async ({ page, browser, identities }, testInfo) => {
	const visitor = identities.create();
	const owner = await identities.owner();
	await signIn(page, visitor);
	const message = `Question ${randomUUID()}`;
	await page.getByLabel('Message', { exact: true }).fill(message);
	await page.getByRole('button', { name: 'Send', exact: true }).click();
	await expect(page.getByText(message, { exact: true })).toBeVisible();
	const context = await browser.newContext({ ...testInfo.project.use });
	try {
		const ownerPage = await context.newPage();
		await signIn(ownerPage, owner);
		await ownerPage.getByRole('navigation', { name: 'Conversations' }).getByRole('link', { name: visitor.name, exact: true }).click();
		await expect(ownerPage.getByText(message, { exact: true })).toBeVisible();
		const reply = `Reply ${randomUUID()}`;
		await ownerPage.getByLabel('Message', { exact: true }).fill(reply);
		await ownerPage.getByRole('button', { name: 'Send', exact: true }).click();
		await expect(ownerPage.getByText(reply, { exact: true })).toBeVisible();
		await page.getByRole('link', { name: 'Refresh messages', exact: true }).click();
		await expect(page.getByText(reply, { exact: true })).toBeVisible();
	} finally { await context.close(); }
});

test('server validation keeps a rejected message draft', async ({ page, identities }) => {
	await signIn(page, identities.create());
	await page.getByLabel('Message', { exact: true }).fill(`Draft ${randomUUID()}`);
	// Removing browser constraints exercises server validation through a native form.
	// DOM editing does not mock the server or replace browser/network APIs.
	await page.getByLabel('Message', { exact: true }).evaluate((element) => { element.removeAttribute('maxlength'); element.value = 'x'.repeat(10001); });
	await page.getByRole('button', { name: 'Send', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('10,000');
	await expect(page.getByLabel('Message', { exact: true })).toHaveValue('x'.repeat(10001));
});

test('a visitor cannot read another visitor’s conversation', async ({ page, browser, identities }, testInfo) => {
	await signIn(page, identities.create());
	const protectedUrl = await page.getByRole('link', { name: 'Refresh messages' }).getAttribute('href');
	const context = await browser.newContext({ ...testInfo.project.use });
	try {
		const other = await context.newPage();
		await signIn(other, identities.create());
		const response = await other.goto(new URL(protectedUrl, page.url()).toString());
		expect(response.status()).toBe(404);
		await expect(other.getByRole('alert')).toContainText('Conversation not found');
	} finally { await context.close(); }
});

test('an unauthenticated conversation link offers email sign-in', async ({ page }) => {
	await page.goto(`/apps/messages/?conversationId=${randomUUID()}`);
	await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
});

test('shared account controls open root account settings and retain invalid recovery input', async ({ page, identities }) => {
	await signIn(page, identities.create());
	await page.getByRole('navigation', { name: 'Site account' }).getByRole('link', { name: 'Your account', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Your account', exact: true })).toBeVisible();
	await expect(page.getByRole('navigation', { name: 'Main navigation', exact: true })).toBeVisible();
	await page.getByText('Recovery email', { exact: true }).first().click();
	const input = page.getByRole('textbox', { name: 'Recovery email', exact: true });
	await input.evaluate((element) => { element.setAttribute('type', 'text'); });
	await input.fill('invalid-email');
	await page.getByRole('button', { name: 'Confirm recovery email', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('valid recovery email');
	await page.getByText('Recovery email', { exact: true }).first().click();
	await expect(input).toHaveValue('invalid-email');
});

test('invalid confirmation links offer a fresh sign-in', async ({ page }) => {
	const response = await page.goto(`/verify?token=${randomUUID()}`);
	expect(response.status()).toBe(400);
	await expect(page.getByRole('alert')).toContainText('expired or is invalid');
	await page.getByRole('link', { name: 'Request a new sign-in link' }).click();
	await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
});

test('passkeys provide an optional alternative to email sign-in', async ({ page, context, identities }, testInfo) => {
	test.skip(testInfo.project.use.javaScriptEnabled === false, 'WebAuthn is a browser JavaScript API; email sign-in is covered in all projects.');
	const cdp = await context.newCDPSession(page);
	await cdp.send('WebAuthn.enable');
	await cdp.send('WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true } });
	await signIn(page, identities.create());
	// Sign out exists before enrollment; wait for the completed enrollment's
	// navigation rather than allowing logout to interrupt the credential request.
	await Promise.all([
		page.waitForEvent('load'),
		page.getByRole('button', { name: 'Add a passkey', exact: true }).click(),
	]);
	await page.getByRole('button', { name: 'Sign out', exact: true }).click();
	await page.goto('/apps/rainbow-hour/');
	await page.getByRole('navigation', { name: 'Site account' }).getByRole('link', { name: 'Sign in', exact: true }).click();
	await page.getByRole('button', { name: 'Sign in with a passkey', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Rainbow Hour', exact: true })).toBeVisible();
});

test('signed account status follows the visitor between apps and clears on sign-out', async ({ page, identities }) => {
	const identity = identities.create();
	await signIn(page, identity);
	// These navigations share one page and must run in order.
	/* eslint-disable no-await-in-loop */
	for (const path of ['/apps/rainbow-hour/', '/apps/lightsfinder/', '/apps/messages/']) {
		await page.goto(path);
		await expect(page.getByRole('navigation', { name: 'Site account', exact: true }).getByText(`Signed in as ${identity.name}.`, { exact: true })).toBeVisible();
	}
	/* eslint-enable no-await-in-loop */
	await page.goto('/apps/rainbow-hour/');
	await page.getByRole('navigation', { name: 'Site account', exact: true }).getByRole('button', { name: 'Sign out', exact: true }).click();
	await page.goto('/apps/lightsfinder/');
	await expect(page.getByRole('navigation', { name: 'Site account', exact: true }).getByText('Signed out', { exact: true })).toBeVisible();
});

test('the owner sees a submitted message as unverified, then verified after email confirmation', async ({ page, browser, identities }, testInfo) => {
	const visitor = identities.create();
	const owner = await identities.owner();
	const message = `Pending message ${randomUUID()}`;
	const ownerContext = await browser.newContext({ ...testInfo.project.use });
	try {
		const link = await pendingMessage(page, visitor, message);
		const ownerPage = await ownerContext.newPage();
		await signIn(ownerPage, owner);
		await ownerPage.getByRole('navigation', { name: 'Conversations' }).getByRole('link', { name: visitor.name, exact: true }).click();
		const bubble = ownerPage.getByRole('listitem').filter({ hasText: message });
		await expect(bubble.getByText('Unverified', { exact: true })).toBeVisible();
		await page.goto(link);
		await expect(page.getByRole('navigation', { name: 'Main navigation', exact: true })).toBeVisible();
		await page.getByRole('button', { name: 'Confirm email', exact: true }).click();
		await expect(page.getByRole('heading', { name: 'Message history', exact: true })).toBeVisible();
		await expect(page.getByText(message, { exact: true })).toBeVisible();
		await ownerPage.getByRole('link', { name: 'Refresh messages', exact: true }).click();
		await expect(bubble.getByText('Verified', { exact: true })).toBeVisible();
		await expect(ownerPage.getByText(message, { exact: true })).toHaveCount(1);
	} finally { await ownerContext.close(); }
});

test('an unverified message survives a verification failure and its confirmation can be retried', async ({ page, identities }) => {
	const identity = identities.create();
	const message = randomUUID();
	const link = await pendingMessage(page, identity, message);
	const db = await previewDatabase();
	try {
		await failFixtureMessage(db, message, true);
		await page.goto(link);
		const failed = page.waitForResponse((response) => {
			return (
				response.request().method() === 'POST' &&
				new URL(response.url()).pathname === '/verify'
			);
		});
		await page.getByRole('button', { name: 'Confirm email', exact: true }).click();
		expect((await failed).status()).toBe(500);
		await expect(page.getByRole('heading', { level: 1, name: 'Something went wrong', exact: true })).toBeVisible();
	} finally { await failFixtureMessage(db, message, false); }
	await page.goto(link);
	await page.getByRole('button', { name: 'Confirm email', exact: true }).click();
	await expect(page.getByText(`Signed in as ${identity.name}.`, { exact: true })).toBeVisible();
	await expect(page.getByRole('list', { name: 'Messages', exact: true }).getByText(message, { exact: true })).toHaveCount(1);
});
