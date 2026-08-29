/**
 * Run Playwright E2E tests against the current branch's versioned preview URL.
 *
 * Workers Builds tags every non-main version with `workers/alias: <branch>`,
 * producing a stable preview URL of the form:
 *
 *   https://<alias>-<worker-name>.<subdomain>.workers.dev
 *
 * This script derives that URL from the current git branch so you never have to
 * copy the preview URL out of the PR comment or dashboard.
 *
 * Override the subdomain (account-specific, but public) if needed:
 *   WORKERS_DEV_SUBDOMAIN=my-subdomain npm run test:preview
 */

import { execSync } from 'node:child_process';

const WORKER_NAME = 'jessehattabaugh-com';
const SUBDOMAIN = process.env.WORKERS_DEV_SUBDOMAIN ?? 'billowing-sunset-4e06';

/** @param {string} cmd */
function run(cmd) {
	console.log(`\n$ ${cmd}`);
	execSync(cmd, { stdio: 'inherit' });
}

const gitBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
const branch = process.env.WORKERS_CI_BRANCH ?? (gitBranch !== 'HEAD' ? gitBranch : undefined);

if (!branch || branch === 'main') {
	throw new Error(
		'Cannot derive a preview URL: expected a non-main branch (preview versions are aliased by branch name).',
	);
}

// Mirror Cloudflare's alias rules: lowercase, alphanumeric + dashes, must start
// with a letter, and combined with the worker name must stay under 63 chars.
const alias = branch
	.toLowerCase()
	.replace(/[^a-z0-9-]/g, '-')
	.replace(/^-+/, '')
	.replace(/-+$/, '')
	.replace(/^[^a-z]+/, '');

if (!alias) {
	throw new Error(`Branch "${branch}" does not produce a valid preview alias.`);
}

const previewUrl = `https://${alias}-${WORKER_NAME}.${SUBDOMAIN}.workers.dev`;
console.log(`\nPreview URL: ${previewUrl}\n`);

process.env.PREVIEW_URL = previewUrl;
run('npx playwright test');
