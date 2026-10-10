import { test, expect, signIn, confirmationLink } from './helpers/auth.js';
import { paths } from '../shared/routes.js';
import { lighthouseAudit } from './helpers/lighthouse.js';

/** Each fixture has its own real account, holiday, and address; cleanup cascades
 * from the identities fixture's users to posts, drafts, votes, and reports. */
function sighting() {
	const id = crypto.randomUUID(), now = new Date();
	return { title: `Glow ${id}`, holiday: `Festival ${id}`, address: `${id} Light Lane`, today: now.toISOString().slice(0,10), ends: new Date(now.getTime() + 86400000).toISOString().slice(0,10), season: String(now.getUTCFullYear()) };
}
/** @param {import('@playwright/test').Page} page @param {ReturnType<typeof sighting>} fixture */
async function compose(page, fixture) {
	await page.goto(`${paths.lightsfinder}?view=share`);
	const form = page.getByRole('form', { name: 'Share a sighting' });
	await form.getByLabel('Photo', { exact: true }).setInputFiles('client/apps/lightsfinder/icon-192.png');
	await form.getByLabel('Display title').fill(fixture.title);
	await form.getByLabel('What makes it special?').fill('A joyful display visible from the public street.');
	await form.getByLabel('Street address').fill(fixture.address);
	await form.getByLabel('County / district').fill(`County ${fixture.holiday}`);
	await form.getByLabel('State / province').fill('Washington');
	await form.getByLabel('Country', { exact: true }).fill('United States');
	await form.getByLabel('Latitude', { exact: true }).fill('47.6062');
	await form.getByLabel('Longitude', { exact: true }).fill('-122.3321');
	await form.getByLabel('Holiday', { exact: true }).selectOption('other');
	await form.getByLabel('Other holiday name (required for Other)').fill(fixture.holiday);
	await form.getByLabel('Season', { exact: true }).fill(fixture.season);
	await form.getByLabel('Date seen').fill(fixture.today);
	await form.getByLabel('Expected last night').fill(fixture.ends);
	await form.getByRole('checkbox', { name: /I took this photo/ }).check();
	return form;
}
/** @param {import('@playwright/test').Page} page @param {ReturnType<typeof sighting>} fixture */
async function publish(page, fixture) {
	const form = await compose(page, fixture);
	await form.getByRole('button', { name: 'Publish sighting' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Your sighting is on the map' })).toBeVisible();
	await expect(page.getByRole('article', { name: fixture.title, exact: true })).toBeVisible();
	return page.url();
}

test('Lightsfinder renders its map, heading, navigation, and an honest empty area', async ({ page }) => {
	await page.goto(`${paths.lightsfinder}?lat=-84&lon=10&radius=1&holiday=custom:${crypto.randomUUID()}`);
	await expect(page.getByRole('heading', { name: 'Lightsfinder', exact: true, level: 1 })).toBeVisible();
	await expect(page.getByRole('region', { name: 'Lights map' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'The map is waiting for its first sparkle.' })).toBeVisible();
	for (const name of ['About', 'Apps', 'Send me a message', 'Colophon']) {
		// eslint-disable-next-line no-await-in-loop -- Keep browser assertions in order.
		await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name, exact: true })).toBeVisible();
	}
	await page.getByRole('link', { name: 'Zoom in', exact: true }).click();
	await expect(page.getByRole('region', { name: 'Lights map' })).toBeVisible();
});

test('all Lightsfinder screens have an accessible heading and controls', async ({ page }) => {
	await page.goto(paths.apps);
	await page.getByRole('link', { name: /Lightsfinder Discover holiday lights/ }).click();
	for (const [link, heading] of [['Plan a drive', 'Less planning.'], ['Season awards', 'The glow of the season.'], ['Share lights', 'Add a little magic to the map.']]) {
		// eslint-disable-next-line no-await-in-loop -- Each screen follows the preceding navigation.
		await page.getByRole('navigation', { name: 'Lightsfinder navigation' }).getByRole('link', { name: new RegExp(link) }).click();
		// eslint-disable-next-line no-await-in-loop -- Assert the screen before navigating away.
		await expect(page.getByRole('heading', { name: new RegExp(heading) })).toBeVisible();
	}
	await expect(page.getByRole('link', { name: 'Sign in to share lights' })).toBeVisible();
	await expect(page.getByRole('form', { name: 'Share a sighting' })).toHaveCount(0);
});

test('Lightsfinder email confirmation in a fresh browser uses the platform and returns to the app', async ({ page, browser, identities }, testInfo) => {
	const identity = identities.create();
	await page.goto(`${paths.lightsfinder}?view=share`);
	await page.getByRole('link', { name: 'Sign in to share lights' }).click();
	await expect(page.getByText('One jessehattabaugh.com account for all apps.', { exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: /Install Messages/ })).toHaveCount(0);
	await page.getByLabel('Name', { exact: true }).fill(identity.name);
	await page.getByLabel('Email', { exact: true }).fill(identity.email);
	await page.getByRole('button', { name: 'Email me a sign-in link', exact: true }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Check your email' })).toBeVisible();
	const link = await confirmationLink(page, identity.email);
	const context = await browser.newContext({ ...testInfo.project.use });
	try {
		const other = await context.newPage();
		await other.goto(link);
		await expect(other).toHaveURL(new RegExp('/verify\\?'));
		await expect(other.getByRole('heading', { name: 'Confirm your email', exact: true })).toBeVisible();
		await expect(other.getByText('Continue to Lightsfinder after confirming.', { exact: true })).toBeVisible();
		await other.reload();
		await other.getByRole('button', { name: 'Confirm email', exact: true }).click();
		await expect(other.getByRole('heading', { name: 'Lightsfinder', exact: true })).toBeVisible();
		await expect(other.getByText(`Signed in as ${identity.name}.`, { exact: true })).toBeVisible();
		await other.getByRole('navigation', { name: 'Lightsfinder navigation' }).getByRole('link', { name: /Share lights/ }).click();
		await expect(other.getByRole('form', { name: 'Share a sighting' })).toBeVisible();
	} finally { await context.close(); }
});

test('photo publication survives field validation, preserves its draft, and never repeats on reload', async ({ page, identities }) => {
	await signIn(page, identities.create());
	const fixture = sighting(), form = await compose(page, fixture);
	// Browser accepts this date, server rejects it because it predates the sighting.
	await form.getByLabel('Expected last night').fill('2000-01-01');
	await form.getByRole('button', { name: 'Publish sighting' }).click();
	await expect(page.getByRole('alert')).toContainText('Complete every required field');
	await expect(page.getByLabel('Display title')).toHaveValue(fixture.title);
	await expect(page.getByLabel('Street address')).toHaveValue(fixture.address);
	await expect(page.getByRole('img', { name: 'Your saved photo, ready to publish' })).toBeVisible();
	await page.getByLabel('Expected last night').fill(fixture.ends);
	await page.getByRole('button', { name: 'Publish sighting' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Your sighting is on the map' })).toBeVisible();
	const detail = page.url();
	await page.reload();
	await expect(page.getByRole('article', { name: fixture.title, exact: true })).toBeVisible();
	expect(page.url()).toBe(detail);
	// Owners cannot rate their own posts; removal works as an ordinary form POST.
	await expect(page.getByRole('form', { name: `Rate ${fixture.title}` })).toHaveCount(0);
	await page.getByRole('form', { name: `Report ${fixture.title}` }).getByRole('button', { name: 'Send report' }).click();
	await expect(page.getByText('○ Lights taken down / season ended', { exact: true })).toBeVisible();
	await page.goto(`${paths.lightsfinder}?holiday=${encodeURIComponent(`custom:${fixture.holiday.toLowerCase()}`)}`);
	await expect(page.getByRole('article', { name: fixture.title, exact: true })).toHaveCount(0);
});

test('another verified account can update its rating, appear in scoped standings, and flag spam', async ({ page, identities }) => {
	const fixture = sighting();
	await signIn(page, identities.create());
	const detail = await publish(page, fixture);
	await signIn(page, identities.create());
	await page.goto(detail);
	const rating = page.getByRole('form', { name: `Rate ${fixture.title}` });
	await rating.getByLabel('Your rating').selectOption('5');
	await rating.getByRole('button', { name: 'Save rating' }).click();
	await expect(page.getByRole('article', { name: fixture.title }).getByText(/★ 5.0/)).toBeVisible();
	await page.getByRole('form', { name: `Rate ${fixture.title}` }).getByLabel('Your rating').selectOption('4');
	await page.getByRole('button', { name: 'Save rating' }).click();
	await expect(page.getByRole('article', { name: fixture.title }).getByText(/★ 4.0.*1 ratings/)).toBeVisible();
	await page.getByRole('form', { name: `Report ${fixture.title}` }).getByLabel('Report reason').selectOption('spam');
	await page.getByRole('button', { name: 'Send report' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Report received' })).toBeVisible();
	await page.getByRole('link', { name: 'Season awards', exact: true }).click();
	const awards = page.getByRole('form', { name: 'Award region' });
	await awards.getByLabel('Region name').fill(`County ${fixture.holiday}`);
	await awards.getByLabel('Country of region').fill('United States');
	await awards.getByLabel('State of county').fill('Washington');
	await awards.getByRole('button', { name: 'Show standings' }).click();
	await expect(page.getByRole('list', { name: 'Award standings' }).getByRole('link', { name: fixture.address })).toBeVisible();
	await expect(page.getByText('No award yet. An address needs at least 3 distinct voters to qualify.')).toBeVisible();
});

test('a road-based circuit respects its budget, or explicitly reports service unavailability', async ({ page, identities }) => {
	await signIn(page, identities.create());
	const fixture = sighting();
	await publish(page, fixture);
	await page.getByRole('link', { name: 'Plan a drive', exact: true }).click();
	const form = page.getByRole('form', { name: 'Plan a lights loop' });
	await form.getByLabel('Maximum distance').fill('10');
	await form.getByLabel('Maximum driving time').fill('30');
	await form.getByRole('button', { name: 'Make my lights loop' }).click();
	const unavailable = page.getByRole('alert').filter({ hasText: 'Driving directions are temporarily unavailable' });
	await expect(page.getByRole('heading', { name: 'Your lights loop', exact: true }).or(unavailable)).toBeVisible({ timeout: 45000 });
	if (await unavailable.isVisible()) {
		await expect(page.getByLabel('Maximum distance')).toHaveValue('10'); return;
	}
	await expect(page.getByRole('region', { name: 'Your lights loop' }).getByRole('link', { name: fixture.title })).toBeVisible();
	const metrics = await page.getByRole('region', { name: 'Your lights loop' }).innerText();
	expect(Number(metrics.match(/([\d.]+) km/)[1])).toBeLessThanOrEqual(10);
	expect(Number(metrics.match(/(\d+) min/)[1])).toBeLessThanOrEqual(30);
	await expect(page.getByText('Return to your starting point', { exact: true })).toBeVisible();
	await page.getByText('Turn-by-turn road directions', { exact: true }).click();
	await expect(page.getByRole('link', { name: 'Open driving directions' })).toBeVisible();
});

test('an empty area offers an honest route result and past seasons stay opt-in', async ({ page }) => {
	const holiday = `custom:${crypto.randomUUID()}`;
	await page.goto(`${paths.lightsfinder}?holiday=${holiday}&view=route&plan=1&lat=-84&lon=20&km=1&minutes=5`);
	await expect(page.getByRole('status').filter({ hasText: 'No current lights fit this driving budget' })).toBeVisible();
	await page.getByRole('link', { name: 'Explore', exact: true }).click();
	await expect(page.getByRole('checkbox', { name: /Include likely spots/ })).not.toBeChecked();
	await page.getByRole('checkbox', { name: /Include likely spots/ }).check();
	await page.getByRole('button', { name: 'Find the glow' }).click();
	await expect(page.getByRole('checkbox', { name: /Include likely spots/ })).toBeChecked();
});

test('the owner can resolve spam reports; ordinary viewers cannot see moderation controls', async ({ page, identities }) => {
	const fixture = sighting();
	await signIn(page, identities.create());
	const detail = await publish(page, fixture);
	await page.getByRole('form', { name: `Report ${fixture.title}` }).getByLabel('Report reason').selectOption('spam');
	await page.getByRole('button', { name: 'Send report' }).click();
	await page.goto(`${paths.lightsfinder}?view=moderation`);
	await expect(page.getByRole('alert')).toContainText('Only the site owner');
	await signIn(page, await identities.owner());
	await page.goto(`${paths.lightsfinder}?view=moderation`);
	const review = page.getByRole('article', { name: `Review ${fixture.title}`, exact: true });
	await review.getByLabel(`Decision for ${fixture.title}`).selectOption('hidden');
	await review.getByRole('button', { name: 'Resolve report' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Report resolved' })).toBeVisible();
	await signIn(page, identities.create());
	const response = await page.goto(detail);
	expect(response.status()).toBe(404);
	await expect(page.getByRole('alert')).toContainText('no longer available');
});

test('Lightsfinder is installable and offers a truthful offline shell', async ({ page, context }, info) => {
	test.skip(info.project.name.includes('no JS'), 'Installation/service workers are optional browser capabilities.');
	await page.goto(paths.lightsfinder);
	await page.evaluate(async () => { await navigator.serviceWorker.ready; });
	await page.reload();
	await context.setOffline(true);
	await page.goto(`${paths.lightsfinder}?offline=1`);
	await expect(page.getByRole('heading', { name: 'The glow will be back.' })).toBeVisible();
	await expect(page.getByText(/Fresh sightings, photos, maps, and driving directions need an internet connection/)).toBeVisible();
	await context.setOffline(false);
	await page.getByRole('link', { name: 'Try Lightsfinder again' }).click();
	await expect(page.getByRole('heading', { name: 'Lightsfinder', exact: true })).toBeVisible();
});

for (const view of ['explore', 'share', 'route', 'awards']) {
	test(`Lightsfinder ${view} scores at least 90 in Lighthouse`, async ({ baseURL }, info) => {
		test.skip(info.project.name !== 'Desktop Chrome', 'Lighthouse runs on Desktop Chrome.');
		test.setTimeout(90000);
		const scores = await lighthouseAudit(new URL(`${paths.lightsfinder}?view=${view}`, baseURL).href);
		for (const name of ['performance','accessibility','best-practices','seo']) { expect(scores[name]?.score ?? 0, name).toBeGreaterThanOrEqual(.9); }
	});
}
