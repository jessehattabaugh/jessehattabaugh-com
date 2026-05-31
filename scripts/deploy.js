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

/** @param {string} cmd */
function run(cmd) {
	console.log(`\n$ ${cmd}`);
	execSync(cmd, { stdio: 'inherit' });
}

const branch =
	process.env.CF_PAGES_BRANCH ?? execSync('git rev-parse --abbrev-ref HEAD').toString().trim();

const isMain = branch === 'main';
const dbName = isMain
	? 'jessehattabaugh-com'
	: `jessehattabaugh-com-preview-${branch.replace(/[^a-z0-9-]/gi, '-')}`;

console.log(`Branch: ${branch}`);
console.log(`DB:     ${dbName}`);

// Build static assets + copy worker
run('npm run build');

if (!isMain) {
	// Create the per-branch D1 database if it doesn't exist yet.
	// wrangler d1 create exits non-zero if the DB already exists, so we swallow that.
	try {
		run(`wrangler d1 create ${dbName} --experimental-backend`);
	} catch {
		console.log(`D1 database "${dbName}" already exists, reusing.`);
	}
}

// Apply migrations
run(`wrangler d1 migrations apply ${dbName} --remote`);

// Deploy
if (isMain) {
	run('wrangler deploy');
} else {
	run(`wrangler versions upload --env preview`);
}
