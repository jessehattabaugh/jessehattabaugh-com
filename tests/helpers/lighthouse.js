import { chromium } from '@playwright/test';
import net from 'net';

/**
 * Returns a free TCP port by binding to :0 momentarily.
 * @returns {Promise<number>}
 */
export function freePort() {
	return new Promise((resolve) => {
		const server = net.createServer();
		server.listen(0, () => {
			const { port } = /** @type {import('net').AddressInfo} */ (server.address());
			server.close(() => {
				resolve(port);
			});
		});
	});
}

/**
 * Runs a Lighthouse audit against a URL using a fresh Chromium instance.
 * Returns category scores as 0–1 values (multiply by 100 for the familiar scale).
 * @param {string} url
 * @returns {Promise<Record<string, { score: number | null }>>}
 */
export async function lighthouseAudit(url) {
	const { default: lighthouse } = await import('lighthouse');
	const port = await freePort();
	const browser = await chromium.launch({ args: [`--remote-debugging-port=${port}`] });
	try {
		const result = await lighthouse(url, {
			port,
			output: 'json',
			logLevel: 'error',
			onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
			// Cloudflare appends `X-Robots-Tag: noindex` to every *.workers.dev
			// subdomain (preview URLs) at the edge, which is unoverridable by the
			// Worker. Production (custom domain) is unaffected, so skip this
			// environment-specific audit rather than asserting on a platform artifact.
			skipAudits: ['is-crawlable'],
		});
		return result.lhr.categories;
	} finally {
		await browser.close();
	}
}
