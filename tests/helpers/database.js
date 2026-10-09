/** A real D1 REST driver, used for fixture setup/cleanup and email-link retrieval. */
import { readConfig } from '../../scripts/preview.js';

/** @type {Promise<import('@cloudflare/workers-types').D1Database> | undefined} */
let connection;

export function previewDatabase() {
	connection ??= connect();
	return connection;
}

async function connect() {
	const token = process.env.E2E_CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
	const account = process.env.CLOUDFLARE_ACCOUNT_ID;
	const name = process.env.PREVIEW_DB_NAME;
	const config = readConfig();
	if (!token || !account || !name?.startsWith(`${config.name}-preview-`)) {
		throw new Error('Stateful E2E tests require E2E_CLOUDFLARE_API_TOKEN (or CLOUDFLARE_API_TOKEN), CLOUDFLARE_ACCOUNT_ID, and PREVIEW_DB_NAME for an isolated preview database.');
	}
	/** @param {string} path @param {unknown} [body] */
	async function api(path, body) {
		const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database${path}`, {
			method: body === undefined ? 'GET' : 'POST',
			headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
			body: body === undefined ? undefined : JSON.stringify(body),
		});
		const data = await response.json();
		if (!response.ok || !data.success) { throw new Error('Cloudflare D1 fixture request failed. Check account and token permissions.'); }
		return data.result;
	}
	async function findDatabase(pageNumber = 1) {
		const databases = await api(`?per_page=100&page=${pageNumber}`);
		const database = databases.find((/** @type {{ name: string }} */ item) => {
			return item.name === name;
		});
		if (database || databases.length < 100) {
			return database;
		}
		return findDatabase(pageNumber + 1);
	}
	const database = await findDatabase();
	if (
		!database ||
		config.d1_databases.some((item) => {
			return item.database_id === database.uuid;
		})
	) {
		throw new Error('Refusing to use an unverified or production database for test fixtures.');
	}
	const response = await fetch(new URL('/apps/messages/', process.env.PREVIEW_URL));
	if (response.headers.get('X-Preview-Database') !== name) {
		throw new Error('The deployed preview and fixture database do not match. Deploy this branch before testing.');
	}
	// Each prepare/bind issues a parameterized query to the actual remote database.
	const driver = {
		prepare(/** @type {string} */ sql) {
			/** @type {Array<string | null>} */
			let params = [];
			async function execute() {
				const [result] = await api(`/${database.uuid}/query`, { sql, params });
				if (!result.success) { throw new Error('D1 fixture query failed.'); }
				return result;
			}
			return {
				bind(/** @type {unknown[]} */ ...values) {
					params = values.map((value) => {
						return value === null ? null : String(value);
					});
					return this;
				},
				run: execute,
				all: execute,
				async first() {
					return (await execute()).results[0] ?? null;
				},
			};
		},
	};
	return /** @type {import('@cloudflare/workers-types').D1Database} */ (/** @type {unknown} */ (driver));
}
