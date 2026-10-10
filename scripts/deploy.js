/** Use the canonical config for every version; only DB, domains and cron differ. */
import { execFileSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { readConfig, currentBranch, previewIdentity, wrangler, ROOT } from './preview.js';

const branch = currentBranch();
const config = readConfig();
const production = branch === 'main';
if (process.argv.includes('--production') && !production) { throw new Error('Production deployment requires main.'); }
if (process.argv.includes('--preview') && production) { throw new Error('Preview deployment requires a non-main branch.'); }
execFileSync(process.execPath, [join(ROOT, 'build/build.js')], { cwd: ROOT, stdio: 'inherit' });

if (production) {
	wrangler(['d1', 'migrations', 'apply', config.d1_databases[0].database_name, '--remote']);
	// Use the same resolved public settings for production as for preview.
	const configPath = join(ROOT, '.wrangler-production.json');
	writeFileSync(configPath, JSON.stringify(config, null, '\t'));
	try { wrangler(['deploy', '--config', configPath]); }
	finally { unlinkSync(configPath); }
} else {
	const { alias, databaseName } = previewIdentity(branch, config.name);
	/** @type {Array<{ name: string, uuid?: string, database_id?: string }>} */
	let databases = JSON.parse(wrangler(['d1', 'list', '--json'], true));
	let database = databases.find((item) => { return item.name === databaseName; });
	if (!database) {
		// A creation failure is an error; never disguise auth/network failures as reuse.
		wrangler(['d1', 'create', databaseName]);
		databases = JSON.parse(wrangler(['d1', 'list', '--json'], true));
		database = databases.find((item) => { return item.name === databaseName; });
	}
	const databaseId = database?.uuid ?? database?.database_id;
	if (!databaseId) { throw new Error(`Could not resolve preview database ${databaseName}.`); }
	if (config.d1_databases.some((/** @type {{ database_id: string }} */ db) => { return db.database_id === databaseId; })) {
		throw new Error('Refusing to bind a production database to a preview version.');
	}
	const previewConfig = {
		...config,
		vars: { .../** @type {Record<string, string>} */ (config.vars ?? {}), PREVIEW_BRANCH: alias, PREVIEW_DB_NAME: databaseName },
		'd1_databases': [{ ...config.d1_databases[0], binding: 'DB', 'database_name': databaseName, 'database_id': databaseId }],
		'preview_urls': true,
	};
	delete previewConfig.routes;
	delete previewConfig.triggers;
	const configPath = join(ROOT, '.wrangler-preview.json');
	writeFileSync(configPath, JSON.stringify(previewConfig, null, '\t'));
	try {
		wrangler(['d1', 'migrations', 'apply', databaseName, '--config', configPath, '--remote']);
		wrangler(['versions', 'upload', '--config', configPath, '--preview-alias', alias]);
	} finally {
		unlinkSync(configPath);
	}
}
