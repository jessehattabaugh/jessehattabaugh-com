import { test, expect, confirmationLink, signIn } from './helpers/auth.js';
import { paths } from '../shared/routes.js';
import { lighthouseAudit } from './helpers/lighthouse.js';

test('platform email confirmation scores at least 90 in Lighthouse', async ({ page, identities }, testInfo) => {
	test.skip(testInfo.project.name !== 'Desktop Chrome', 'Lighthouse runs on Desktop Chrome.');
	test.setTimeout(90000);
	const identity = identities.create();
	await page.goto(paths.login);
	await page.getByLabel('Name', { exact: true }).fill(identity.name);
	await page.getByLabel('Email', { exact: true }).fill(identity.email);
	await page.getByRole('button', { name: 'Email me a sign-in link', exact: true }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Check your email' })).toBeVisible();
	const categories = await lighthouseAudit(await confirmationLink(page, identity.email));
	for (const name of ['performance', 'accessibility', 'best-practices', 'seo']) {
		expect(categories[name]?.score ?? 0, name).toBeGreaterThanOrEqual(0.9);
	}
});

// Platform identity is shared by apps in every desktop/mobile and JS/no-JS project.
test('direct sign-in opens the platform account and sign-out applies across apps', async ({ page, identities }) => {
	const identity = identities.create();
	await page.goto(paths.account);
	await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
	await page.getByLabel('Name', { exact: true }).fill(identity.name);
	await page.getByLabel('Email', { exact: true }).fill(identity.email);
	await page.getByRole('button', { name: 'Email me a sign-in link', exact: true }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Check your email' })).toBeVisible();
	await page.goto(await confirmationLink(page, identity.email));
	await page.getByRole('button', { name: 'Confirm email', exact: true }).click();
	await expect(page).toHaveURL(new RegExp(`${paths.account}$`));
	await expect(page.getByRole('heading', { name: 'Your account', exact: true })).toBeVisible();
	await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Account', exact: true })).toBeVisible();
	await page.getByRole('navigation', { name: 'Your apps' }).getByRole('link', { name: 'Lightsfinder', exact: true }).click();
	await expect(page.getByText(`Signed in as ${identity.name}.`, { exact: true })).toBeVisible();
	await page.getByRole('link', { name: 'Manage your account', exact: true }).click();
	await page.getByRole('button', { name: 'Sign out', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
	await page.goto(`${paths.lightsfinder}?view=share`);
	await expect(page.getByRole('link', { name: 'Sign in to share lights' })).toBeVisible();
	await page.goto(paths.messages);
	await expect(page.getByRole('link', { name: 'Sign in to your conversation' })).toBeVisible();
});

test('email validation preserves input and the originating app', async ({ page, identities }) => {
	const identity = identities.create();
	await page.goto(`${paths.login}?returnTo=lightsfinder`);
	await page.getByLabel('Name', { exact: true }).fill(identity.name);
	await page.getByLabel('Email', { exact: true }).fill(identity.email);
	await page.getByLabel('Name', { exact: true }).evaluate((element) => { element.value = ' '.repeat(2); });
	await page.getByRole('button', { name: 'Email me a sign-in link', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('Enter your name and a valid email address');
	await expect(page.getByLabel('Email', { exact: true })).toHaveValue(identity.email);
	await page.getByLabel('Name', { exact: true }).fill(identity.name);
	await page.getByRole('button', { name: 'Email me a sign-in link', exact: true }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Check your email' })).toBeVisible();
	const link = new URL(await confirmationLink(page, identity.email));
	// A query added to an email cannot replace the destination stored with proof.
	link.searchParams.set('returnTo', 'https://example.com');
	await page.goto(link.toString());
	await page.getByRole('button', { name: 'Confirm email', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Lightsfinder', exact: true })).toBeVisible();
});

test('an external return destination falls back to the platform account', async ({ page, identities }) => {
	const identity = identities.create();
	await page.goto(`${paths.login}?returnTo=${encodeURIComponent('https://example.com')}`);
	await page.getByLabel('Name', { exact: true }).fill(identity.name);
	await page.getByLabel('Email', { exact: true }).fill(identity.email);
	await page.getByRole('button', { name: 'Email me a sign-in link', exact: true }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Check your email' })).toBeVisible();
	const link = new URL(await confirmationLink(page, identity.email));
	// Older Messages email URLs still display the platform confirmation page.
	link.pathname = '/apps/messages/verify';
	await page.goto(link.toString());
	await expect(page.getByRole('heading', { name: 'Confirm your email', exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Confirm email', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Your account', exact: true })).toBeVisible();
});

test('platform passkey sign-in returns to Lightsfinder', async ({ page, context, identities }, testInfo) => {
	test.skip(testInfo.project.use.javaScriptEnabled === false, 'Passkeys need browser JavaScript; email sign-in covers all projects.');
	const cdp = await context.newCDPSession(page);
	await cdp.send('WebAuthn.enable');
	await cdp.send('WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true } });
	await signIn(page, identities.create());
	await page.getByRole('link', { name: 'Manage your account', exact: true }).click();
	await Promise.all([
		page.waitForNavigation(),
		page.getByRole('button', { name: 'Add a passkey', exact: true }).click(),
	]);
	await page.getByRole('button', { name: 'Sign out', exact: true }).click();
	await page.goto(`${paths.lightsfinder}?view=share`);
	await page.getByRole('link', { name: 'Sign in to share lights' }).click();
	await page.getByRole('button', { name: 'Sign in with a passkey', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Lightsfinder', exact: true })).toBeVisible();
	await page.getByRole('navigation', { name: 'Lightsfinder navigation' }).getByRole('link', { name: /Share lights/ }).click();
	await expect(page.getByRole('form', { name: 'Share a sighting' })).toBeVisible();
});
