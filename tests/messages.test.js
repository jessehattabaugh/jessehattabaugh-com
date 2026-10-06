import { randomUUID } from 'node:crypto';
import { test, expect, signIn, confirmationLink } from './helpers/messages.js';
import { previewDatabase } from './helpers/database.js';
import { expireVerification, failFixtureMessage } from '../shared/data/fixtures.js';

// Each core flow runs in desktop/mobile Chrome with JS both on and off.
test('a held message survives a database failure and its confirmation can be retried', async ({ page, identities }) => {
	const identity = identities.create();
	const message = randomUUID();
	await page.goto('/apps/messages/');
	await page.getByLabel('Name', { exact: true }).fill(identity.name);
	await page.getByLabel('Email', { exact: true }).fill(identity.email);
	await page.getByLabel('Message', { exact: true }).fill(message);
	await page.getByRole('button', { name: 'Send', exact: true }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Check your email' })).toBeVisible();
	const link = await confirmationLink(page, identity.email);
	const db = await previewDatabase();
	try {
		await failFixtureMessage(db, message, true);
		await page.goto(link);
		const failed = page.waitForResponse((response) => response.request().method() === 'POST' && new URL(response.url()).pathname === '/apps/messages/verify');
		await page.getByRole('button', { name: 'Confirm email', exact: true }).click();
		expect((await failed).status()).toBe(500);
		await expect(page.getByRole('heading', { level: 1, name: 'Something went wrong', exact: true })).toBeVisible();
	} finally { await failFixtureMessage(db, message, false); }
	await page.goto(link);
	await page.getByRole('button', { name: 'Confirm email', exact: true }).click();
	await expect(page.getByText(`Signed in as ${identity.name}.`, { exact: true })).toBeVisible();
	await expect(page.getByRole('list', { name: 'Messages', exact: true }).getByText(message, { exact: true })).toHaveCount(1);
});

test('a guest confirms their email, reads history, sends another message, and signs out', async ({ page, identities }) => {
	const identity = identities.create();
	const first = `First message ${randomUUID()} <script>alert(1)</script>`;
	await page.goto('/apps/messages/');
	await page.getByLabel('Name', { exact: true }).fill(identity.name);
	await page.getByLabel('Email', { exact: true }).fill(identity.email);
	await page.getByLabel('Message', { exact: true }).fill(first);
	await page.getByRole('button', { name: 'Send', exact: true }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Check your email' })).toBeVisible();
	const confirmation = await confirmationLink(page, identity.email);
	await page.goto(confirmation);
	// Loading an email link does not consume it (mail scanners can visit safely).
	await page.reload();
	await page.getByRole('button', { name: 'Confirm email', exact: true }).click();
	await expect(page.getByText(first, { exact: true })).toBeVisible();
	const second = `Second message ${randomUUID()}`;
	await page.getByLabel('Message', { exact: true }).fill(second);
	await page.getByRole('button', { name: 'Send', exact: true }).click();
	await expect(page.getByText(second, { exact: true })).toBeVisible();
	await page.reload();
	await expect(page.getByText(first, { exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Sign out', exact: true }).click();
	await expect(page.getByRole('link', { name: 'Sign in to your conversation' })).toBeVisible();
	await page.goto(confirmation);
	await expect(page.getByRole('alert')).toContainText('expired or is invalid');
});

test('email sign-in recovers the same conversation on another browser', async ({ page, browser, identities }, testInfo) => {
	const identity = identities.create();
	await signIn(page, identity);
	const message = `Cross-device message ${randomUUID()}`;
	await page.getByLabel('Message', { exact: true }).fill(message);
	await page.getByRole('button', { name: 'Send', exact: true }).click();
	await expect(page.getByText(message, { exact: true })).toBeVisible();
	const context = await browser.newContext({ ...testInfo.project.use });
	try {
		const other = await context.newPage();
		await signIn(other, identity);
		await expect(other.getByText(message, { exact: true })).toBeVisible();
	} finally { await context.close(); }
});

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

test('invalid confirmation links offer a fresh sign-in', async ({ page }) => {
	const response = await page.goto(`/apps/messages/verify?token=${randomUUID()}`);
	expect(response.status()).toBe(400);
	await expect(page.getByRole('alert')).toContainText('expired or is invalid');
	await page.getByRole('link', { name: 'Request a new sign-in link' }).click();
	await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
});

test('an expired confirmation link cannot sign in or publish a held message', async ({ page, identities }) => {
	const identity = identities.create();
	await page.goto('/apps/messages/');
	await page.getByLabel('Name', { exact: true }).fill(identity.name);
	await page.getByLabel('Email', { exact: true }).fill(identity.email);
	await page.getByLabel('Message', { exact: true }).fill(`Expired draft ${randomUUID()}`);
	await page.getByRole('button', { name: 'Send', exact: true }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Check your email' })).toBeVisible();
	const link = await confirmationLink(page, identity.email);
	await expireVerification(await previewDatabase(), new URL(link).searchParams.get('token'));
	// A new email request performs expired-proof maintenance. An old held
	// message still cannot be published after that cleanup, in JS/no-JS browsers.
	await page.goto('/login');
	await page.getByLabel('Name', { exact: true }).fill(identity.name);
	await page.getByLabel('Email', { exact: true }).fill(identity.email);
	await page.getByRole('button', { name: 'Email me a sign-in link', exact: true }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Check your email' })).toBeVisible();
	const response = await page.goto(link);
	expect(response.status()).toBe(400);
	await expect(page.getByRole('alert')).toContainText('expired or is invalid');
	await page.goto('/apps/messages/');
	await expect(page.getByRole('link', { name: 'Sign in to your conversation' })).toBeVisible();
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
	await page.getByRole('link', { name: 'Sign in to your conversation' }).click();
	await page.getByRole('button', { name: 'Sign in with a passkey', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
});

test('a confirmed recovery email keeps message history on the same account', async ({ page, identities }) => {
	const identity = identities.create();
	const recovery = identities.create();
	await signIn(page, identity);
	const message = `History retained ${randomUUID()}`;
	await page.getByLabel('Message', { exact: true }).fill(message);
	await page.getByRole('button', { name: 'Send', exact: true }).click();
	await expect(page.getByText(message, { exact: true })).toBeVisible();
	await page.getByText('Recovery email', { exact: true }).first().click();
	await page.getByLabel('Recovery email', { exact: true }).fill(recovery.email);
	await page.getByRole('button', { name: 'Confirm recovery email', exact: true }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Check your email' })).toBeVisible();
	await page.goto(await confirmationLink(page, recovery.email));
	await page.getByRole('button', { name: 'Confirm email', exact: true }).click();
	await page.getByRole('button', { name: 'Sign out', exact: true }).click();
	await signIn(page, { ...identity, email: recovery.email });
	await expect(page.getByText(message, { exact: true })).toBeVisible();
});
