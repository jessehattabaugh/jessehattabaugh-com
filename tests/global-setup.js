/**
 * Playwright global setup — guards the "real servers only" testing rule.
 * E2E tests must always point at a deployed preview URL, never localhost.
 */
export default async function globalSetup() {
	const url = process.env.PREVIEW_URL;
	if (!url || !/^https:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)*\.workers\.dev\/?$/i.test(url)) {
		throw new Error(
			'PREVIEW_URL is not set. Run: export PREVIEW_URL=https://<version-prefix>-jessehattabaugh-com.<subdomain>.workers.dev',
		);
	}
	const response = await fetch(new URL('/apps/messages/', url));
	const branch = response.headers.get('X-Preview-Branch');
	const database = response.headers.get('X-Preview-Database');
	if (!response.ok || !branch || !database?.startsWith('jessehattabaugh-com-preview-') ||
		(process.env.PREVIEW_DB_NAME && process.env.PREVIEW_DB_NAME !== database)) {
		throw new Error('PREVIEW_URL must point to an isolated branch deployment with the expected preview database. Deploy this branch before testing.');
	}
	process.env.PREVIEW_DB_NAME = database;
}
