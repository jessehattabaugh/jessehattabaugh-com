/** Upload an unpromoted Worker version with only explicitly configured runtime
 * secrets. Tooling API tokens/mailbox settings must never become Worker secrets. */
import './environment.js';
import { execFileSync } from 'node:child_process';
import { WRANGLER, ROOT } from './preview.js';

/** @type {Record<string,string>} */
const secrets = {};
for (const name of ['SESSION_SECRET', 'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'OWNER_SETUP_TOKEN']) {
	if (process.env[name]?.trim()) { secrets[name] = process.env[name]; }
}
if (!Object.keys(secrets).length) { throw new Error('No runtime secrets configured. Fill the runtime secret values in .dev.vars first.'); }
execFileSync(process.execPath, [WRANGLER, 'versions', 'secret', 'bulk'], {
	cwd: ROOT, input: JSON.stringify(secrets), stdio: ['pipe', 'inherit', 'inherit'],
});
console.log('Runtime secrets uploaded to an unpromoted version. Deploy the selected version explicitly when ready.');
