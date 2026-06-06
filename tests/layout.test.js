import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { render } from '../shared/html.js';
import { layout } from '../shared/templates/layout.js';

describe('layout PWA metadata', () => {
	it('renders manifest and install metadata in the document head', () => {
		const html = render(layout({ title: 'Home', body: 'Hello' }));

		expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest" />');
		expect(html).toContain('<link rel="icon" href="/favicon.svg" type="image/svg+xml" />');
		expect(html).toContain(
			'<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />',
		);
		expect(html).toContain('<meta name="mobile-web-app-capable" content="yes" />');
		expect(html).toContain('<meta name="apple-mobile-web-app-capable" content="yes" />');
	});

	it('defines an installable manifest and service worker assets', () => {
		const manifest = JSON.parse(
			readFileSync(new URL('../client/manifest.webmanifest', import.meta.url), 'utf8'),
		);
		const serviceWorker = readFileSync(
			new URL('../client/service-worker.js', import.meta.url),
			'utf8',
		);

		expect(manifest.start_url).toBe('/');
		expect(manifest.display).toBe('standalone');
		expect(manifest.icons).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ src: '/icons/icon-192.png', sizes: '192x192' }),
				expect.objectContaining({ src: '/icons/icon-512.png', sizes: '512x512' }),
			]),
		);
		expect(serviceWorker).toContain("worker.addEventListener('install'");
		expect(serviceWorker).toContain("worker.addEventListener('fetch'");
	});
});
