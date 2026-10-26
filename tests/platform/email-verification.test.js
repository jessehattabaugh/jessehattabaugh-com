import { randomUUID } from 'node:crypto';
import { paths } from '../../shared/routes.js';
import { test, expect, signIn, emailSignIn, confirmationLink } from '../helpers/messages.js';
import { previewDatabase } from '../helpers/database.js';
import { expireVerification, failFixtureMessage } from '../helpers/fixtures.js';

test.describe('real email delivery and verification', () => {
	test.skip(process.env.E2E_EMAIL_FLOW !== '1', 'Opt in with E2E_EMAIL_FLOW=1 and a controlled E2E_EMAIL_DOMAIN; this suite sends real email.');

	test('the owner sees a submitted message as unverified, then verified after email confirmation', async ({ page, browser, identities }, testInfo) => {
		const visitor = identities.create();
		const owner = await identities.owner();
		const message = `Pending message ${randomUUID()}`;
		const ownerContext = await browser.newContext({ ...testInfo.project.use });
		try {
			await page.goto('/apps/messages/');
			await page.getByLabel('Name', { exact: true }).fill(visitor.name);
			await page.getByLabel('Email', { exact: true }).fill(visitor.email);
			await page.getByLabel('Message', { exact: true }).fill(message);
			await page.getByRole('button', { name: 'Send', exact: true }).click();
			await expect(page.getByRole('status').filter({ hasText: 'Your message has been submitted unverified' })).toBeVisible();
			await expect(page.getByRole('heading', { name: 'Message history', exact: true })).toHaveCount(0);
			const link = await confirmationLink(page, visitor.email);
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

	test('anonymous use of a verified email never signs in or automatically verifies the message', async ({ page, browser, identities }, testInfo) => {
		const visitor = identities.create();
		await emailSignIn(page, visitor);
		const guestContext = await browser.newContext({ ...testInfo.project.use });
		try {
			const guest = await guestContext.newPage();
			const message = `Unproven sender ${randomUUID()}`;
			await guest.goto('/apps/messages/');
			await guest.getByLabel('Name', { exact: true }).fill('Unproven sender');
			await guest.getByLabel('Email', { exact: true }).fill(visitor.email);
			await guest.getByLabel('Message', { exact: true }).fill(message);
			await guest.getByRole('button', { name: 'Send', exact: true }).click();
			await expect(guest.getByRole('status').filter({ hasText: 'submitted unverified' })).toBeVisible();
			await expect(guest.getByRole('heading', { name: 'Message history', exact: true })).toHaveCount(0);
			// A separate login is proof of identity, not approval of this submission.
			await emailSignIn(page, visitor);
			await expect(page.getByRole('listitem').filter({ hasText: message }).getByText('Unverified', { exact: true })).toBeVisible();
		} finally { await guestContext.close(); }
	});

	test('root email sign-in returns to the app that requested authentication', async ({ page, identities }) => {
		const visitor = identities.create();
		await page.goto('/apps/rainbow-hour/');
		await page.getByRole('navigation', { name: 'Site account' }).getByRole('link', { name: 'Sign in', exact: true }).click();
		await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
		await page.getByLabel('Name', { exact: true }).fill(visitor.name);
		await page.getByLabel('Email', { exact: true }).fill(visitor.email);
		await page.getByRole('button', { name: 'Email me a sign-in link', exact: true }).click();
		await expect(page.getByRole('status').filter({ hasText: 'Check your email' })).toBeVisible();
		await page.goto(await confirmationLink(page, visitor.email));
		await page.getByRole('button', { name: 'Confirm email', exact: true }).click();
		await expect(page.getByRole('heading', { name: 'Rainbow Hour', exact: true })).toBeVisible();
		await expect(page.getByText(`Signed in as ${visitor.name}.`, { exact: true })).toBeVisible();
	});

	test('an unverified message survives a verification failure and its confirmation can be retried', async ({ page, identities }) => {
		const identity = identities.create();
		const message = randomUUID();
		await page.goto('/apps/messages/');
		await page.getByLabel('Name', { exact: true }).fill(identity.name);
		await page.getByLabel('Email', { exact: true }).fill(identity.email);
		await page.getByLabel('Message', { exact: true }).fill(message);
		await page.getByRole('button', { name: 'Send', exact: true }).click();
		await expect(page.getByRole('status').filter({ hasText: 'Your message has been submitted unverified' })).toBeVisible();
		const link = await confirmationLink(page, identity.email);
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

	test('a guest confirms their email, reads history, sends another message, and signs out', async ({ page, identities }) => {
		const identity = identities.create();
		const first = `First message ${randomUUID()} <script>alert(1)</script>`;
		await page.goto('/apps/messages/');
		await page.getByLabel('Name', { exact: true }).fill(identity.name);
		await page.getByLabel('Email', { exact: true }).fill(identity.email);
		await page.getByLabel('Message', { exact: true }).fill(first);
		await page.getByRole('button', { name: 'Send', exact: true }).click();
		await expect(page.getByRole('status').filter({ hasText: 'Your message has been submitted unverified' })).toBeVisible();
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
		await emailSignIn(page, identity);
		const message = `Cross-device message ${randomUUID()}`;
		await page.getByLabel('Message', { exact: true }).fill(message);
		await page.getByRole('button', { name: 'Send', exact: true }).click();
		await expect(page.getByText(message, { exact: true })).toBeVisible();
		const context = await browser.newContext({ ...testInfo.project.use });
		try {
			const other = await context.newPage();
			await emailSignIn(other, identity);
			await expect(other.getByText(message, { exact: true })).toBeVisible();
		} finally { await context.close(); }
	});

	test('an expired confirmation link cannot sign in or verify a submitted message', async ({ page, identities }) => {
		const identity = identities.create();
		await page.goto('/apps/messages/');
		await page.getByLabel('Name', { exact: true }).fill(identity.name);
		await page.getByLabel('Email', { exact: true }).fill(identity.email);
		await page.getByLabel('Message', { exact: true }).fill(`Expired draft ${randomUUID()}`);
		await page.getByRole('button', { name: 'Send', exact: true }).click();
		await expect(page.getByRole('status').filter({ hasText: 'Your message has been submitted unverified' })).toBeVisible();
		const link = await confirmationLink(page, identity.email);
		await expireVerification(await previewDatabase(), new URL(link).searchParams.get('token'));
		// A new email request performs expired-proof maintenance. A submitted
		// message still cannot be verified after that cleanup, in JS/no-JS browsers.
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

	test('a confirmed recovery email keeps message history on the same account', async ({ page, identities }) => {
		const identity = identities.create();
		const recovery = identities.create();
		await signIn(page, identity);
		const message = `History retained ${randomUUID()}`;
		await page.getByLabel('Message', { exact: true }).fill(message);
		await page.getByRole('button', { name: 'Send', exact: true }).click();
		await expect(page.getByText(message, { exact: true })).toBeVisible();
		await page.getByText('Recovery email', { exact: true }).first().click();
		await page.getByRole('textbox', { name: 'Recovery email', exact: true }).fill(recovery.email);
		await page.getByRole('button', { name: 'Confirm recovery email', exact: true }).click();
		await expect(page.getByRole('status').filter({ hasText: 'Your message has been submitted unverified' })).toBeVisible();
		await page.goto(await confirmationLink(page, recovery.email));
		await page.getByRole('button', { name: 'Confirm email', exact: true }).click();
		await page.getByRole('button', { name: 'Sign out', exact: true }).click();
		await signIn(page, { ...identity, email: recovery.email });
		await expect(page.getByText(message, { exact: true })).toBeVisible();
	});

	test('email sign-in from Lightsfinder returns to the app', async ({ page, identities }) => {
		const identity = identities.create();
		await page.goto(`${paths.lightsfinder}?view=share`);
		await page.getByRole('link', { name: 'Sign in to share lights' }).click();
		await page.getByLabel('Name', { exact: true }).fill(identity.name);
		await page.getByLabel('Email', { exact: true }).fill(identity.email);
		await page.getByRole('button', { name: 'Email me a sign-in link', exact: true }).click();
		await expect(page.getByRole('status').filter({ hasText: 'Check your email' })).toBeVisible();
		await page.goto(await confirmationLink(page, identity.email));
		await page.getByRole('button', { name: 'Confirm email', exact: true }).click();
		await expect(page.getByRole('heading', { name: 'Lightsfinder', exact: true })).toBeVisible();
		await expect(page.getByText(`Signed in as ${identity.name}.`, { exact: true })).toBeVisible();
	});
});
