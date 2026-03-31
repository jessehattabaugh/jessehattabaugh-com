import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

/**
 * Runs wrangler pages deploy unless running inside Cloudflare Pages build.
 *
 * @param {string[]} cliArguments
 * @returns {void}
 */
function run(cliArguments) {
	if (process.env.CF_PAGES == '1') {
		console.log(
			'Cloudflare Pages git deployment detected; skipping Wrangler API deploy command.',
		);
		return;
	}

	const require = createRequire(import.meta.url);
	const wranglerCliPath = require.resolve('wrangler/bin/wrangler.js');
	const commandArguments = [wranglerCliPath, 'pages', 'deploy', '.', ...cliArguments];
	const result = spawnSync(process.execPath, commandArguments, { stdio: 'inherit' });

	if (result.error) {
		throw result.error;
	}

	if (result.status != 0) {
		throw new Error(`Wrangler deploy failed with exit code ${result.status}`);
	}
}

run(process.argv.slice(2));
