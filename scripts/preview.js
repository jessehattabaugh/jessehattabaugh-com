/** Shared branch identity for deployment and browser tests. */
import './environment.js';
import { workerVariables } from './environment.js';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const WRANGLER = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url));

/** @returns {Record<string, unknown> & { name: string, d1_databases: Array<{ binding: string, database_name: string, database_id: string, migrations_dir?: string }>, routes?: unknown, triggers?: unknown }} */
export function readConfig() {
	// Skip JSON string literals when stripping JSONC comments/trailing commas,
	// so URLs and comment-looking text inside values survive unchanged.
	const source = readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
	const json = source.replace(/"(?:\\.|[^"\\])*"|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (match) => match.startsWith('"') ? match : ' ')
		.replace(/"(?:\\.|[^"\\])*"|,(\s*[}\]])/g, (match, close) => close ?? match);
	const config = JSON.parse(json);
	config.vars = { ...config.vars, ...workerVariables() };
	return config;
}

export function currentBranch() {
	const branch = process.env.WORKERS_CI_BRANCH ?? process.env.CF_PAGES_BRANCH ?? execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8', cwd: ROOT }).trim();
	if (!branch || branch === 'HEAD') { throw new Error('Cannot determine the branch. Set WORKERS_CI_BRANCH for a detached checkout.'); }
	return branch;
}

/** @param {string} branch @param {string} workerName */
export function previewIdentity(branch, workerName) {
	if (branch === 'main') { throw new Error('Preview deployment and tests require a non-main branch.'); }
	const normalized = branch.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^[^a-z]+/, '').replace(/-+$/, '');
	const limit = 63 - workerName.length - 1;
	if (!normalized || limit < 10) { throw new Error(`Branch "${branch}" does not produce a valid preview alias.`); }
	const hash = createHash('sha256').update(branch).digest('hex').slice(0, 8);
	const alias = normalized === branch && normalized.length <= limit ? normalized : `${normalized.slice(0, limit - 9).replace(/-+$/, '')}-${hash}`;
	if (!alias) { throw new Error(`Branch "${branch}" does not produce a valid preview alias.`); }
	// Hash names that need normalization/truncation to prevent branch collisions.
	return { alias, databaseName: `${workerName}-preview-${alias}` };
}

/** @param {string[]} args @param {boolean} [capture] */
export function wrangler(args, capture = false) {
	return execFileSync(process.execPath, [WRANGLER, ...args], {
		cwd: ROOT, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit',
	});
}
