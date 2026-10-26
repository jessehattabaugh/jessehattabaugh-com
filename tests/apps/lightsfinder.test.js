import { test, expect, signIn } from '../helpers/messages.js';
import { paths } from '../../shared/routes.js';
import { lighthouseAudit } from '../helpers/lighthouse.js';

/** Each fixture has its own real account, holiday, and address; cleanup cascades
 * from the identities fixture's users to posts, drafts, votes, and reports. */
function sighting() {
	const id = crypto.randomUUID(), now = new Date();
	return { title: `Glow ${id}`, holiday: `Festival ${id}`, address: `${id} Light Lane`, today: now.toISOString().slice(0,10), ends: new Date(now.getTime() + 86400000).toISOString().slice(0,10), season: String(now.getUTCFullYear()) };
}
/** @param {import('@playwright/test').Page} page @param {ReturnType<typeof sighting>} fixture */
async function compose(page, fixture) {
	await page.goto(`${paths.lightsfinder}?view=share&lat=47.6062&lon=-122.3321`);
	const form = page.getByRole('form', { name: 'Share a sighting' });
	await form.getByLabel('Photo', { exact: true }).setInputFiles('client/apps/lightsfinder/icon-192.png');
	await form.getByLabel('Display title').fill(fixture.title);
	await form.getByLabel('What makes it special?').fill('A joyful display visible from the public street.');
	await form.getByLabel('Street address').fill(fixture.address);
	await form.getByLabel('County / district').fill(`County ${fixture.holiday}`);
	await form.getByLabel('State / province').fill('Washington');
	await form.getByLabel('Country', { exact: true }).fill('United States');
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
	const account = page.getByRole('navigation', { name: 'Site account', exact: true });
	await expect(account.getByRole('link', { name: 'Jesse Hattabaugh home', exact: true })).toBeVisible();
	await expect(account.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
	await page.getByRole('link', { name: 'Zoom in', exact: true }).click();
	await expect(page.getByRole('region', { name: 'Lights map' })).toBeVisible();
});

test('all Lightsfinder screens have an accessible heading and controls', async ({ page }) => {
	await page.goto(paths.apps);
	await page.getByRole('link', { name: /Lightsfinder Discover holiday lights/ }).click();
	// Each navigation and assertion must finish before the next screen opens.
	/* eslint-disable no-await-in-loop */
	for (const [link, heading] of [['Plan a drive', 'Less planning.'], ['Season awards', 'The glow of the season.'], ['Share lights', 'Add a little magic to the map.']]) {
		await page.getByRole('navigation', { name: 'Lightsfinder navigation' }).getByRole('link', { name: new RegExp(link) }).click();
		await expect(page.getByRole('heading', { name: new RegExp(heading) })).toBeVisible();
	}
	/* eslint-enable no-await-in-loop */
	await expect(page.getByRole('link', { name: 'Sign in to share lights' })).toBeVisible();
	await expect(page.getByRole('form', { name: 'Share a sighting' })).toHaveCount(0);
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

test('location is the first discovery action and coordinates are never editable', async ({ page }, info) => {
	await page.goto(paths.lightsfinder);
	await expect(page.getByRole('heading', { name: 'Find holiday decorations near you.' })).toBeVisible();
	await expect(page.getByLabel(/latitude|longitude/i)).toHaveCount(0);
	const location = page.getByRole('form', { name: 'Find decorations near you' });
	if (info.project.name.includes('no JS')) {
		await expect(location.getByText(/Browser location needs JavaScript/)).toBeVisible();
	} else { await expect(location.getByRole('button', { name: 'Use my location' })).toBeVisible(); }
	await page.getByRole('link', { name: 'Pan east', exact: true }).click();
	await expect(page).toHaveURL(/lon=153\.6/);
	await page.getByRole('link', { name: 'Zoom in', exact: true }).click();
	await expect(page).toHaveURL(/zoom=4/);
});

test('browser location immediately searches the area and preserves holiday filters', async ({ page, context }, info) => {
	test.skip(info.project.name.includes('no JS'), 'Browser geolocation requires JavaScript; map navigation remains the baseline.');
	await context.setGeolocation({ latitude: 51.5074, longitude: -.1278 });
	await context.grantPermissions(['geolocation']);
	await page.goto(`${paths.lightsfinder}?holiday=christmas&radius=5`);
	await page.getByRole('form', { name: 'Find decorations near you' }).getByRole('button', { name: 'Use my location' }).click();
	await expect(page).toHaveURL(/lat=51\.507400/);
	await expect(page).toHaveURL(/lon=-0\.127800/);
	await expect(page).toHaveURL(/zoom=12/);
	await expect(page.getByRole('form', { name: 'Find lights', exact: true }).getByLabel('Holiday', { exact: true })).toHaveValue('christmas');
	await expect(page.getByRole('region', { name: 'Lights map' })).toBeVisible();
});

test('denied location permission leaves map navigation available and allows retry', async ({ page, context }, info) => {
	test.skip(info.project.name.includes('no JS'), 'Browser permission is an enhancement.');
	const session = await context.newCDPSession(page);
	await page.goto(paths.lightsfinder);
	await session.send('Browser.setPermission', { permission: { name: 'geolocation' }, setting: 'denied', origin: new URL(page.url()).origin });
	const location = page.getByRole('form', { name: 'Find decorations near you' });
	await location.getByRole('button', { name: 'Use my location' }).click();
	await expect(location.getByRole('status')).toContainText('Location permission denied');
	await expect(location.getByRole('button', { name: 'Use my location' })).toBeEnabled();
	await page.getByRole('link', { name: 'Pan east', exact: true }).click();
	await expect(page.getByRole('region', { name: 'Lights map' })).toBeVisible();
});

test('dragging the map searches its new center, wheel zooms, and back restores the area', async ({ page }, info) => {
	test.skip(info.project.name.includes('no JS'), 'Pointer gestures enhance native map links.');
	await page.goto(`${paths.lightsfinder}?lat=51.5&lon=0&zoom=12`);
	const map = page.getByRole('img', { name: 'Street map with holiday light sightings' });
	await map.scrollIntoViewIfNeeded();
	const bounds = await map.boundingBox();
	if (!bounds) { throw new Error('Map missing'); }
	await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
	await page.mouse.down();
	await page.mouse.move(bounds.x + bounds.width / 2 + 90, bounds.y + bounds.height / 2 + 30, { steps: 8 });
	await page.mouse.up();
	await expect(page).not.toHaveURL(/lon=0&/);
	const dragged = page.url();
	await map.hover(); await page.mouse.wheel(0, -100);
	await expect(page).toHaveURL(/zoom=13/);
	await page.goBack(); await expect(page).toHaveURL(dragged);
	await expect(map).toBeVisible();
});

test('touch dragging and pinch zoom search the selected area', async ({ page, context }, info) => {
	test.skip(info.project.name.includes('no JS') || !info.project.name.includes('Mobile'), 'Touch gestures run on the mobile JavaScript browser.');
	await page.goto(`${paths.lightsfinder}?lat=51.5&lon=0&zoom=12`);
	const map = page.getByRole('img', { name: 'Street map with holiday light sightings' });
	await map.scrollIntoViewIfNeeded();
	const bounds = await map.boundingBox(); if (!bounds) { throw new Error('Map missing'); }
	const session = await context.newCDPSession(page), x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height / 2;
	await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x - 25, y, id: 1 }, { x: x + 25, y, id: 2 }] });
	await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 65, y: y + 25, id: 1 }, { x: x + 65, y: y + 25, id: 2 }] });
	await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
	await expect(page).toHaveURL(/zoom=13/);
	await expect(page).not.toHaveURL(/lat=51.5&/);
	await expect(map).toBeVisible();
});

test('pen dragging and repeated keyboard navigation keep the map usable', async ({ page, context }, info) => {
	test.skip(info.project.name.includes('no JS'), 'Pointer and keyboard shortcuts enhance native map links.');
	await page.goto(`${paths.lightsfinder}?lat=51.5&lon=0&zoom=12`);
	const map = page.getByRole('img', { name: 'Street map with holiday light sightings' });
	await map.scrollIntoViewIfNeeded();
	const bounds = await map.boundingBox(); if (!bounds) { throw new Error('Map missing'); }
	const session = await context.newCDPSession(page), x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height / 2;
	await session.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, pointerType: 'pen' });
	await session.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x - 90, y, button: 'left', buttons: 1, pointerType: 'pen' });
	await session.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x - 90, y, button: 'left', buttons: 0, pointerType: 'pen' });
	await expect(page).not.toHaveURL(/lon=0&/);
	await map.focus(); await page.keyboard.press('ArrowRight');
	await expect(map).toBeFocused();
	await expect.poll(() => { return Number(new URL(page.url()).searchParams.get('lon')); }).toBeGreaterThan(.04);
	await expect(map).toBeFocused();
	await page.keyboard.press('+');
	await expect(page).toHaveURL(/zoom=13/);
});

test('locating the browser reveals nearby published decorations on the map', async ({ page, context, identities }, info) => {
	test.skip(info.project.name.includes('no JS'), 'Browser GPS enhances the same server-side area search.');
	await signIn(page, identities.create());
	const fixture = sighting(); await publish(page, fixture);
	const holiday = encodeURIComponent(`custom:${fixture.holiday.toLowerCase()}`);
	await page.goto(`${paths.lightsfinder}?holiday=${holiday}&lat=0&lon=0&zoom=3`);
	await expect(page.getByRole('article', { name: fixture.title, exact: true })).toHaveCount(0);
	await context.setGeolocation({ latitude: 47.6062, longitude: -122.3321 });
	await context.grantPermissions(['geolocation']);
	await page.getByRole('form', { name: 'Find decorations near you' }).getByRole('button', { name: 'Use my location' }).click();
	await expect(page.getByRole('article', { name: fixture.title, exact: true })).toBeVisible();
	await page.getByRole('region', { name: 'Lights map' }).getByRole('link', { name: `View ${fixture.title}`, exact: true }).click();
	await expect(page).toHaveURL(/post=/);
	await expect(page.getByRole('article', { name: fixture.title, exact: true })).toBeVisible();
});
