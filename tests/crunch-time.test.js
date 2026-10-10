import { test, expect } from '@playwright/test';
import { paths } from '../shared/routes.js';
import { previewDatabase } from './helpers/database.js';

// Each browser context gets its own device cookie. Cleanup targets only the
// owner of this test's unique saved workout, never shared record counts.
/** @type {string[]} */
let savedIds = [];
test.beforeEach(() => { savedIds = []; });
test.afterEach(async () => {
	if (!savedIds.length) { return; }
	const db = await previewDatabase();
	// Foreign-key-related cleanup must be sequential for each test owner.
	/* eslint-disable no-await-in-loop */
	for (const id of savedIds) {
		const row = await db.prepare('SELECT owner FROM crunch_workouts WHERE id = ?').bind(id).first();
		if (row) {
			await db.prepare('DELETE FROM crunch_meals WHERE owner = ?').bind(row.owner).run();
			await db.prepare('DELETE FROM crunch_workouts WHERE owner = ?').bind(row.owner).run();
		}
	}
	/* eslint-enable no-await-in-loop */
});
/** @param {import('@playwright/test').Page} page @param {number} reps @param {string} [style] */
async function save(page, reps, style = 'Standard situps') {
	await page.getByLabel('Workout style', { exact: true }).selectOption({ label: style });
	await page.getByLabel('Situps completed', { exact: true }).fill(String(reps));
	await page.getByRole('button', { name: 'Save workout & earn points', exact: true }).click();
	await expect(page).toHaveURL(/\?saved=/);
	const id = new URL(page.url()).searchParams.get('saved');
	savedIds.push(id);
	await expect(page.getByText('Workout saved. Every situp earns one snack point!', { exact: true })).toBeVisible();
	return id;
}

test('manual workouts feed Mochi, survive reload, and retries do not award duplicate points', async ({ page, context }) => {
	await page.goto(paths.crunch);
	const id = await save(page, 12, 'Situps with a twist');
	await expect(page.getByText('12 situps', { exact: true })).toBeVisible();
	await expect(page.getByText('With a twist', { exact: true })).toBeVisible();
	const replay = await context.request.post(paths.crunch, { form: { action: 'workout', id, reps: '12', style: 'twist' } });
	expect(replay.ok()).toBeTruthy();
	await page.reload();
	await expect(page.getByText('12 situps', { exact: true })).toHaveCount(1);
	const mealRequest = page.waitForRequest((request) => { return request.method() === 'POST' && new URL(request.url()).pathname === paths.crunch; });
	await page.getByRole('button', { name: 'Feed Mochi · 10 points', exact: true }).click();
	const meal = new URLSearchParams((await mealRequest).postData());
	await expect(page.getByText('Yum! Mochi enjoyed a snack. Thank you!', { exact: true })).toBeVisible();
	await expect(page.getByText('Save 8 more situps to feed Mochi a snack.', { exact: true })).toBeVisible();
	const retryMeal = await context.request.post(paths.crunch, { form: { action: 'feed', id: meal.get('id') } });
	expect(retryMeal.ok()).toBeTruthy();
	await page.reload();
	await expect(page.getByText('Save 8 more situps to feed Mochi a snack.', { exact: true })).toBeVisible();
	await expect(page.getByRole('meter', { name: 'Snack happiness', exact: true })).toHaveAttribute('value', '100');
	await expect(page.getByRole('button', { name: 'Feed Mochi · 10 points', exact: true })).toHaveCount(0);
});

test('a small workout earns points and the server omits unaffordable snacks', async ({ page, context }) => {
	await page.goto(paths.crunch);
	await save(page, 4);
	await expect(page.getByText('Save 6 more situps to feed Mochi a snack.', { exact: true })).toBeVisible();
	const response = await context.request.post(paths.crunch, { form: { action: 'feed', id: crypto.randomUUID() } });
	expect(response.status()).toBe(422);
	expect(await response.text()).toContain('Mochi needs 10 snack points for a meal. Save a workout first.');
});

test('server validation retains submitted count and style without saving or redirecting', async ({ page, context }) => {
	await page.goto(paths.crunch);
	const response = await context.request.post(paths.crunch, { form: { action: 'workout', id: crypto.randomUUID(), reps: '1001', style: 'twist' } });
	expect(response.status()).toBe(422);
	const body = await response.text();
	expect(body).toContain('Enter a whole number of situps from 1 to 1000');
	expect(body).toContain('value="1001"');
	expect(body).toContain('value="twist" selected');
});

test('workout records belong to the device and another device cannot view them', async ({ page, browser, baseURL }) => {
	await page.goto(paths.crunch);
	await save(page, 7);
	const other = await browser.newContext({ baseURL, javaScriptEnabled: false });
	try {
		const tab = await other.newPage(); await tab.goto(paths.crunch);
		await expect(tab.getByText('7 situps', { exact: true })).toHaveCount(0);
		await expect(tab.getByText('Your first little win belongs right here. You’ve got this!', { exact: true })).toBeVisible();
	} finally { await other.close(); }
});

test('calibration is required before automatic workouts, with manual logging still available', async ({ page }, testInfo) => {
	test.skip(testInfo.project.use.javaScriptEnabled === false, 'Motion controls are optional JavaScript capabilities.');
	await page.goto(paths.crunch);
	await page.getByRole('button', { name: 'Start workout', exact: true }).click();
	await expect(page.getByText('Teach Mochi 3 example situps first.', { exact: true })).toBeVisible();
	await save(page, 3);
	await expect(page.getByText('3 situps', { exact: true })).toBeVisible();
});

test('calibration can be paused, resumed, and finished without blocking manual logging', async ({ page, context }, testInfo) => {
	test.skip(testInfo.project.use.javaScriptEnabled === false, 'Motion controls use optional JavaScript APIs.');
	await context.grantPermissions(['accelerometer', 'gyroscope']);
	await page.goto(paths.crunch);
	await page.getByRole('button', { name: 'Teach Mochi my situp', exact: true }).click();
	await page.getByRole('button', { name: 'Pause workout', exact: true }).click();
	await expect(page.getByText('Paused. Recline before you resume.', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Resume workout', exact: true }).click();
	await page.getByRole('button', { name: 'Finish workout', exact: true }).click();
	await expect(page.getByText('Workout finished. You can enter a manual count below.', { exact: true })).toBeVisible();
	await save(page, 2);
	await expect(page.getByText('2 situps', { exact: true })).toBeVisible();
});

test('an unfinished manual count is recovered after reload before saving', async ({ page }, testInfo) => {
	test.skip(testInfo.project.use.javaScriptEnabled === false, 'Draft recovery uses optional device storage.');
	await page.goto(paths.crunch);
	await page.getByLabel('Situps completed', { exact: true }).fill('9');
	await page.reload();
	await expect(page.getByLabel('Situps completed', { exact: true })).toHaveValue('9');
	await expect(page.getByText('Your unfinished workout was restored. Review and save it before starting another.', { exact: true })).toBeVisible();
	await save(page, 9);
	await expect(page.getByLabel('Situps completed', { exact: true })).toHaveValue('');
});

test('installation and privacy instructions remain available without device capabilities', async ({ page }) => {
	await page.goto(paths.crunch);
	await page.getByText('Install & privacy', { exact: true }).click();
	await expect(page.getByText(/On iPhone, open in Safari/)).toBeVisible();
	await expect(page.getByText(/Raw motion samples are never uploaded/)).toBeVisible();
});

// Real-phone acceptance (no fake sensor/recognition events): calibrate each
// style with 3 examples, complete 10 full cycles, try partial and missing-twist
// cycles, pause/resume, background the app, deny motion/microphone permissions,
// switch grip and retrain, and speak each command with coaching on/off. Verify
// counts/cues against actual movements on iOS Safari and Android Chrome.
// These cannot be certified by desktop Chromium or device viewport emulation.


test('cookie-less submissions retain the workout count and explain how to recover', async ({ request }) => {
	const response = await request.post(paths.crunch, { form: { action: 'workout', id: crypto.randomUUID(), reps: '6', style: 'standard' } });
	expect(response.status()).toBe(422);
	const body = await response.text();
	expect(body).toContain('Enable cookies, reload this page, and try again. Your count is below.');
	expect(body).toContain('value="6"');
});

test('installation assets are available and offline navigation explains connectivity needs', async ({ page, context }, testInfo) => {
	test.skip(testInfo.project.use.javaScriptEnabled === false, 'Service workers require JavaScript.');
	await page.goto(paths.crunch);
	await page.evaluate(async () => { await navigator.serviceWorker.ready; });
	await page.reload();
	await context.setOffline(true);
	try {
		await page.goto(`${paths.crunch}?offline=1`);
		await expect(page.getByRole('heading', { name: 'Mochi’s taking a little breather.', exact: true })).toBeVisible();
		await expect(page.getByText(/Saving workouts, history, and snacks need a connection/)).toBeVisible();
	} finally { await context.setOffline(false); }
	await page.getByRole('link', { name: 'Try again when connected', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Crunch Time', exact: true })).toBeVisible();
});


test('blocked or missing motion data explains manual logging and still accepts a workout', async ({ page }, testInfo) => {
	test.skip(testInfo.project.use.javaScriptEnabled === false, 'Motion permission is an optional JavaScript capability.');
	// Unlike the control test, this fresh context has no sensor permission grant.
	await page.goto(paths.crunch);
	await page.getByRole('button', { name: 'Teach Mochi my situp', exact: true }).click();
	await expect(page.getByText(/Motion access was denied or unavailable|No motion data arrived|Motion sensing is unavailable/)).toBeVisible({ timeout: 10000 });
	await save(page, 1);
	await expect(page.getByText('1 situps', { exact: true })).toBeVisible();
});
