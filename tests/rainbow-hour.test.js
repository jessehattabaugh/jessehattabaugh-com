import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { lighthouseAudit } from './helpers/lighthouse.js';

// ── Rainbow Hour E2E tests ────────────────────────────────────────────────────
//
// Coverage runs across all four configurations (desktop/mobile Chrome, JS
// on/off). The no-JS product (explainer + coordinate form + server-rendered
// rainbow windows) is asserted in every project; the JS dashboard, live sky
// check, and push subscription flows are JS-only.
//
// Determinism strategy:
//   - Sun position is pinned with page.clock to instants whose solar geometry
//     at the fixed test location was verified against NOAA references:
//       2026-03-20T20:00:00Z @ (40.7128, -74.006) → sun 33° up, azimuth 236°
//         → inside the rainbow band, anti-solar point north-east.
//       2026-03-20T17:00:00Z @ same → sun ~49° up → above the 42° band.
//   - Weather is pinned with page.route to Open-Meteo-shaped fixtures. The
//     weather module anchors "now" on the API's current.time, so fixtures are
//     deterministic regardless of the (possibly faked) device clock.

const NYC = { latitude: 40.7128, longitude: -74.006 };
const SUN_IN_BAND = '2026-03-20T20:00:00Z';
const SUN_TOO_HIGH = '2026-03-20T17:00:00Z';
const WEATHER_NOW_SEC = Math.floor(Date.parse(SUN_IN_BAND) / 1000);

/**
 * Build an Open-Meteo-shaped body. Hourly buckets are [now-3h, now-2h, now-1h,
 * now]; the module's 3-hour window sums the last three of those.
 * @param {{ pastPrecip?: number[], currentPrecip?: number, cloudCover?: number, weatherCode?: number }} [opts]
 */
function openMeteoBody({
	pastPrecip = [1.2, 0.5, 0.1],
	currentPrecip = 0,
	cloudCover = 40,
	weatherCode = 3,
} = {}) {
	const hours = pastPrecip.length;
	const times = [];
	const precip = [];
	for (let i = hours; i >= 1; i--) {
		times.push(WEATHER_NOW_SEC - i * 3600);
		precip.push(pastPrecip[hours - i] ?? 0);
	}
	times.push(WEATHER_NOW_SEC);
	precip.push(currentPrecip);
	return {
		current: {
			time: WEATHER_NOW_SEC,
			weather_code: weatherCode,
			precipitation: currentPrecip,
			cloud_cover: cloudCover,
		},
		hourly: { time: times, precipitation: precip },
	};
}

/** @param {import('@playwright/test').Page} page @param {object} body */
async function mockWeather(page, body) {
	await page.route('**/api.open-meteo.com/**', (route) => {
		return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
	});
}

/**
 * Stub the browser's PushManager with a deterministic subscription lifecycle,
 * mirroring the setup in push-notifications.test.js.
 * @param {import('@playwright/test').Page} page
 * @param {string} endpoint  unique push endpoint, state-independent per test
 */
async function mockPushManager(page, endpoint) {
	await page.addInitScript(
		({ endpoint }) => {
			let currentSubscription = null;

			const fakeSubscription = {
				endpoint,
				expirationTime: null,
				toJSON() {
					return {
						endpoint: this.endpoint,
						expirationTime: this.expirationTime,
						keys: {
							p256dh: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
							auth: 'BTBZMqHH6r4Tts7J_aSIgg',
						},
					};
				},
				unsubscribe() {
					currentSubscription = null;
					return Promise.resolve(true);
				},
			};

			const fakePushManager = {
				getSubscription() {
					return Promise.resolve(currentSubscription);
				},
				subscribe() {
					currentSubscription = fakeSubscription;
					return Promise.resolve(fakeSubscription);
				},
			};

			const fakeRegistration = { pushManager: fakePushManager };

			Object.defineProperty(navigator.serviceWorker, 'ready', {
				configurable: true,
				get() {
					return Promise.resolve(fakeRegistration);
				},
			});
		},
		{ endpoint },
	);
}

/**
 * Grant geolocation + seed the fixed test location, then capture it in the
 * dashboard via the "Use my location" button.
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').BrowserContext} context
 */
async function useMyLocation(page, context) {
	await context.setGeolocation({ latitude: NYC.latitude, longitude: NYC.longitude });
	await context.grantPermissions(['geolocation'], { origin: new URL(page.url()).origin });
	await page.getByRole('button', { name: /Use my location/ }).click();
	// Coords are rounded to ~1 km before display: 40.7128 → 40.71.
	await expect(page.getByRole('status', { name: /40\.71°, -74\.01°/ })).toBeVisible();
}

/** @param {import('@playwright/test').TestInfo} testInfo */
function skipWithoutJs(testInfo) {
	test.skip(
		testInfo.project.use.javaScriptEnabled === false,
		'Requires JavaScript',
	);
}

// ── Apps page card (all 4 configurations) ────────────────────────────────────

test('apps page lists the Rainbow Hour card', async ({ page }) => {
	await page.goto('/apps');
	const card = page.getByRole('link', { name: /Rainbow Hour/ });
	await expect(card).toBeVisible();
	await expect(card).toHaveAttribute('href', '/apps/rainbow-hour/');
	await expect(page.getByText('Know when rainbows are due')).toBeVisible();
});

// ── Page render: the no-JS product is the baseline (all 4 configurations) ─────

test('/apps/rainbow-hour/ — heading, explainer, and coordinate form', async ({ page }) => {
	const response = await page.goto('/apps/rainbow-hour/');
	expect(response?.status()).toBe(200);
	await expect(
		page.getByRole('heading', { name: '🌈 Rainbow Hour', level: 1, exact: true }),
	).toBeVisible();
	await expect(page.getByRole('heading', { name: 'What makes a rainbow' })).toBeVisible();
	await expect(page.getByLabel('Latitude')).toBeVisible();
	await expect(page.getByLabel('Longitude')).toBeVisible();
	await expect(
		page.getByRole('button', { name: 'Show rainbow windows' }),
	).toBeVisible();
});

test('coordinate form renders today’s rainbow windows server-side', async ({ page }) => {
	await page.goto('/apps/rainbow-hour/');
	await page.getByLabel('Latitude').fill('40.7128');
	await page.getByLabel('Longitude').fill('-74.006');
	await page.getByRole('button', { name: 'Show rainbow windows' }).click();

	// Native GET navigation — the URL is a shareable permalink (HATEOAS).
	await expect(page).toHaveURL(/\/apps\/rainbow-hour\/\?lat=40\.7128&lon=-74\.006$/);
	await expect(
		page.getByRole('heading', { name: /Rainbow windows near 40\.7128°, -74\.006°/ }),
	).toBeVisible();
	// New York always has at least one window: two in summer (sun crosses the
	// 42° band twice), one merged window in winter (midday sun never exceeds 42°).
	const timeCount = await page.locator('time').count();
	expect(timeCount).toBeGreaterThanOrEqual(1);
});

test('invalid coordinates return 422 with inline error and preserved values', async ({ page }) => {
	const response = await page.goto('/apps/rainbow-hour/?lat=999&lon=0');
	expect(response?.status()).toBe(422);
	await expect(page.getByRole('alert')).toHaveText(/±90/);
	// Previously submitted values ride along in the re-rendered form.
	await expect(page.getByLabel('Latitude')).toHaveValue('999');
});

// ── Live dashboard (JavaScript configurations only) ──────────────────────────

test('dashboard: geolocation capture and live sun readout', async ({ page, context }, testInfo) => {
	skipWithoutJs({ page, context }, testInfo);
	await page.goto('/apps/rainbow-hour/');
	await useMyLocation(page, context);

	const sun = page.getByRole('status', { name: 'Sun position' });
	await expect(sun).toHaveText(/Sun \d+°/);
});

test('dashboard: check-the-sky reports a likely rainbow with direction', async ({ page, context }, testInfo) => {
	skipWithoutJs({ page, context }, testInfo);
	await page.clock.install({ time: SUN_IN_BAND });
	await mockWeather(page, openMeteoBody());
	await page.goto('/apps/rainbow-hour/');
	await useMyLocation(page, context);

	await page.getByRole('button', { name: /Check the sky now/ }).click();

	// Sun 33° up at azimuth 236° → anti-solar point at 56° → look north-east.
	await expect(page.getByRole('status', { name: 'Sky check result' })).toHaveText(
		/Rainbow likely — look north-east!/,
	);
	const factors = page.getByRole('list', { name: 'Rainbow factors' });
	await expect(factors.getByText('✓ Rain in the air')).toBeVisible();
	await expect(factors.getByText('✓ Sun low on the horizon')).toBeVisible();
	await expect(factors.getByText('✓ Bright spells')).toBeVisible();
});

const NO_RAINBOW_SCENARIOS = [
	{
		name: 'dry sky, no recent rain',
		time: SUN_IN_BAND,
		weather: () => {
			return openMeteoBody({ pastPrecip: [0, 0, 0], currentPrecip: 0, cloudCover: 40, weatherCode: 0 });
		},
		failedFactor: '✗ Rain in the air',
	},
	{
		name: 'solid overcast, no bright spells',
		time: SUN_IN_BAND,
		weather: () => {
			return openMeteoBody({ pastPrecip: [1.5, 0.8, 0.2], cloudCover: 95, weatherCode: 3 });
		},
		failedFactor: '✗ Bright spells',
	},
	{
		name: 'midday sun above the rainbow band',
		time: SUN_TOO_HIGH,
		weather: () => {
			return openMeteoBody();
		},
		failedFactor: '✗ Sun low on the horizon',
	},
];

for (const scenario of NO_RAINBOW_SCENARIOS) {
	test(`dashboard: check-the-sky says no rainbow — ${scenario.name}`, async ({ page, context }, testInfo) => {
		skipWithoutJs({ page, context }, testInfo);
		await page.clock.install({ time: scenario.time });
		await mockWeather(page, scenario.weather());
		await page.goto('/apps/rainbow-hour/');
		await useMyLocation(page, context);

		await page.getByRole('button', { name: /Check the sky now/ }).click();

		await expect(page.getByRole('status', { name: 'Sky check result' })).toHaveText(
			'No rainbow likely right now.',
		);
		await expect(page.getByRole('list', { name: 'Rainbow factors' })).toContainText(
			scenario.failedFactor,
		);
	});
}

// ── Push alert subscription (JavaScript configurations only) ─────────────────
// Mirrors push-notifications.test.js: the PushManager is stubbed so the test
// isolates our subscribe/unsubscribe logic from the external push service.

test('alerts toggle subscribes with location and timezone, and unsubscribes', async ({ page, context }, testInfo) => {
	skipWithoutJs({ page, context }, testInfo);

	const endpoint = `https://push.example.test/${randomUUID()}`;
	await mockPushManager(page, endpoint);
	await page.goto('/apps/rainbow-hour/');
	await context.setGeolocation({ latitude: NYC.latitude, longitude: NYC.longitude });
	await context.grantPermissions(['geolocation', 'notifications'], {
		origin: new URL(page.url()).origin,
	});
	await page.getByRole('button', { name: /Use my location/ }).click();
	await expect(page.getByRole('status', { name: /40\.71°, -74\.01°/ })).toBeVisible();

	// Switch alerts ON — the bell reflects the enabled state.
	const bellOff = page.getByRole('button', { name: 'Enable rainbow alerts' });
	await expect(bellOff).toHaveAttribute('aria-pressed', 'false');
	const subscribeRequest = page.waitForRequest((req) => {
		return req.method() === 'POST' && req.url().includes('/apps/rainbow-hour/api/subscribe');
	});
	await bellOff.click();

	const bellOn = page.getByRole('button', { name: 'Rainbow alerts enabled' });
	await expect(bellOn).toHaveAttribute('aria-pressed', 'true');
	await expect(bellOn).toHaveText('🔔');

	// The subscription reached the server with a usable shape, including the
	// coarse (~1 km) coordinates and timezone the wake cron needs.
	const subReq = await subscribeRequest;
	const subBody = /** @type {any} */ (subReq.postDataJSON());
	expect(subBody.endpoint).toBe(endpoint);
	expect(subBody.keys.p256dh).toBeTruthy();
	expect(subBody.keys.auth).toBeTruthy();
	expect(subBody.latitude).toBe(40.71);
	expect(subBody.longitude).toBe(-74.01);
	expect(typeof subBody.timezone).toBe('string');
	expect(subBody.timezone.length).toBeGreaterThan(0);

	// Toggle OFF — the browser unsubscribes and the server-side record is removed.
	const unsubscribeRequest = page.waitForRequest((req) => {
		return req.method() === 'DELETE' && req.url().includes('/apps/rainbow-hour/api/subscribe');
	});
	await bellOn.click();
	const bellOffAgain = page.getByRole('button', { name: 'Enable rainbow alerts' });
	await expect(bellOffAgain).toHaveAttribute('aria-pressed', 'false');
	await expect(bellOffAgain).toHaveText('🔕');

	const unsubReq = await unsubscribeRequest;
	expect(/** @type {any} */ (unsubReq.postDataJSON()).endpoint).toBe(endpoint);
});

// ── Service worker (JavaScript configurations only) ──────────────────────────

test('service worker activates with the app scope', async ({ page }, testInfo) => {
	skipWithoutJs({ page }, testInfo);
	await page.goto('/apps/rainbow-hour/');

	// Activation proves the module service worker (and its /shared/* imports,
	// which the build copies into the asset tree) loads and installs cleanly.
	await expect
		.poll(async () => {
			return page.evaluate(async () => {
				const reg = await navigator.serviceWorker.getRegistration('/apps/rainbow-hour/');
				return reg?.active?.state ?? 'none';
			});
		})
		.toBe('activated');

	const scope = await page.evaluate(async () => {
		const reg = await navigator.serviceWorker.getRegistration('/apps/rainbow-hour/');
		return reg?.scope ?? null;
	});
	expect(scope).toMatch(/\/apps\/rainbow-hour\/$/);
});

// ── Lighthouse (Desktop Chrome only) ──────────────────────────────────────────

test.describe('Lighthouse audit', () => {
	test.beforeEach(() => {
		test.skip(
			test.info().project.name !== 'Desktop Chrome',
			'Lighthouse only runs on Desktop Chrome',
		);
	});

	const MIN_SCORE = 0.9;

	test('/apps/rainbow-hour/ — scores ≥ 90', async ({ baseURL }) => {
		const categories = await lighthouseAudit(new URL('/apps/rainbow-hour/', baseURL).href);
		expect(categories.performance?.score ?? 0, 'performance').toBeGreaterThanOrEqual(MIN_SCORE);
		expect(categories.accessibility?.score ?? 0, 'accessibility').toBeGreaterThanOrEqual(
			MIN_SCORE,
		);
		expect(
			categories['best-practices']?.score ?? 0,
			'best-practices',
		).toBeGreaterThanOrEqual(MIN_SCORE);
		expect(categories.seo?.score ?? 0, 'seo').toBeGreaterThanOrEqual(MIN_SCORE);
	});
});
