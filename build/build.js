/** One Parcel graph owns pages, metadata, images, browser code and service workers. */
import { rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { prepareInputs } from './prepare-inputs.js';
import { ROOT } from './shared/preview.js';

// Parcel emits directly to the asset binding; clean once so removed routes and
// assets cannot survive a rebuild. The source directories are never copied.
await rm(join(ROOT, 'dist', 'client'), { recursive: true, force: true });
await prepareInputs(ROOT);
execFileSync(join(ROOT, 'node_modules', '.bin', 'parcel'), [
	'build', 'build/site.json', 'client', 'client/apps', '.',
	'--no-source-maps', '--no-content-hash', '--public-url', './',
], { cwd: ROOT, stdio: 'inherit' });
