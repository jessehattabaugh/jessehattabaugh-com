/**
 * Playwright global setup — guards the "real servers only" testing rule.
 * E2E tests must always point at a deployed preview URL, never localhost.
 */
export default async function globalSetup() {
	const url = process.env.PREVIEW_URL;
	if (!url || !/^https:\/\/[a-z0-9-]+\.workers\.dev\/?$/i.test(url)) {
		throw new Error(
			'PREVIEW_URL is not set. Run: export PREVIEW_URL=https://<version-prefix>-jessehattabaugh-com.<subdomain>.workers.dev',
		);
	}
}
