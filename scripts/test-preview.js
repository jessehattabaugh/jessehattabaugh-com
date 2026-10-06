/** Run real-browser tests against this branch's deployment. */
import { execFileSync } from 'node:child_process';
import { readConfig, currentBranch, previewIdentity, ROOT } from './preview.js';

const config = readConfig();
const { alias, databaseName } = previewIdentity(currentBranch(), config.name);
const subdomain = process.env.WORKERS_DEV_SUBDOMAIN ?? 'billowing-sunset-4e06';
const url = process.env.PREVIEW_URL ?? `https://${alias}-${config.name}.${subdomain}.workers.dev`;
console.log(`Preview URL: ${url}`);
execFileSync(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2)], {
	cwd: ROOT, stdio: 'inherit', env: { ...process.env, PREVIEW_URL: url, PREVIEW_DB_NAME: databaseName },
});
