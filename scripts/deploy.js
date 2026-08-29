/**
 * Per-branch deploy script for Cloudflare Workers.
 * Invoked by Workers Builds (or locally) for every build.
 *
 * D1 path: creates/reuses a per-branch D1 database, applies migrations,
 * then deploys the Worker with the correct binding.
 *
 * Requires env vars:
 *   CLOUDFLARE_API_TOKEN  — scoped to Workers + D1
 *   CLOUDFLARE_ACCOUNT_ID
 */

import { execSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';

/** @param {string} cmd */
function run(cmd) {
	console.log(`\n$ ${cmd}`);
	execSync(cmd, { stdio: 'inherit' });
}

const gitBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
const branch =
	process.env.WORKERS_CI_BRANCH ??
	process.env.CF_PAGES_BRANCH ??
	(gitBranch !== 'HEAD' ? gitBranch : undefined) ??
	(() => { throw new Error('Cannot determine branch: detached HEAD and no CI env var set'); })();

const isMain = branch === 'main';
const dbName = isMain
	? 'jessehattabaugh-com'
	: `jessehattabaugh-com-preview-${branch.replace(/[^a-z0-9-]/gi, '-')}`;

// Stable preview alias: one per branch, so each branch gets its own URL.
// Workers Builds already aliases by branch name; adding it here keeps local
// `npm run deploy` consistent and deterministic. Must be lowercase/alphanumeric
// + dashes, start with a letter, and (combined with the Worker name) ≤ 63 chars.
const alias = branch
	.toLowerCase()
	.replace(/[^a-z0-9-]/g, '-')
	.replace(/^-+/, '')
	.replace(/-+$/, '')
	.replace(/^[^a-z]+/, '')
	.slice(0, 63 - 'jessehattabaugh-com'.length - 1);

console.log(`Branch: ${branch}`);
console.log(`DB:     ${dbName}`);
console.log(`Alias:  ${alias}`);

// Build static assets + copy worker
run('npm run build');

if (isMain) {
	run(`wrangler d1 migrations apply ${dbName} --remote`);
	run('wrangler deploy');
} else {
	// Create the per-branch D1 database if it doesn't exist yet.
	try {
		run(`wrangler d1 create ${dbName}`);
	} catch {
		console.log(`D1 database "${dbName}" already exists, reusing.`);
	}

	run(`wrangler d1 migrations apply ${dbName} --remote`);

	// Resolve the actual database ID so the Worker binds to the right database.
	/** @type {{ name: string, uuid?: string, database_id?: string }[]} */
	const databases = JSON.parse(execSync('wrangler d1 list --json', { encoding: 'utf8' }));
	const db = databases.find((d) => { return d.name === dbName; });
	if (!db) { throw new Error(`Could not find D1 database "${dbName}" after creation`); }
	const dbId = db.uuid ?? db.database_id;
	console.log(`DB ID: ${dbId}`);

	// Write a temp config with the correct per-branch binding, then clean it up.
	// Keys are quoted because they are JSON field names, not JS identifiers.
	const previewConfig = {
		'assets': { 'binding': 'ASSETS', 'directory': './dist/client/' },
		'compatibility_date': '2026-05-01',
		'd1_databases': [
			{ 'binding': 'DB', 'database_id': dbId, 'database_name': dbName, 'migrations_dir': 'db/migrations' },
		],
		'main': './worker/index.js',
		'name': 'jessehattabaugh-com',
		'observability': { 'enabled': true },
	};
	const tempConfig = '.wrangler-preview.json';
	writeFileSync(tempConfig, JSON.stringify(previewConfig, null, '\t'));
	try {
		run(`wrangler versions upload --config ${tempConfig} --preview-alias ${alias}`);
	} finally {
		unlinkSync(tempConfig);
	}
}
