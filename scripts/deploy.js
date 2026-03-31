import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

/**
 * Runs netlify deploy unless running inside Netlify build.
 *
 * @param {string[]} cliArguments
 * @returns {void}
 */
function run(cliArguments) {
	if (process.env.NETLIFY == 'true') {
		console.log('Netlify build deployment detected; skipping CLI deploy command.');
		return;
	}

	const require = createRequire(import.meta.url);
	const netlifyCliPath = require.resolve('netlify-cli/bin/run.js');
	const commandArguments = [netlifyCliPath, 'deploy', '--dir', '.', ...cliArguments];
	const result = spawnSync(process.execPath, commandArguments, { stdio: 'inherit' });

	if (result.error) {
		throw result.error;
	}

	if (result.status != 0) {
		throw new Error(`Netlify deploy failed with exit code ${result.status}`);
	}
}

run(process.argv.slice(2));
