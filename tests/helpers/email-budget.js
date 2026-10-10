import { createHash } from 'node:crypto';
import { mkdir, open } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const DAILY_EMAIL_TEST_LIMIT = 8;

/**
 * Atomic slots are shared by parallel workers, retries, branches and repeated
 * runs on this machine. Failed sends still spend a slot; never reset on setup.
 * A separate CI machine has its own ledger, so live-email CI must be serialized.
 * @returns {Promise<boolean>}
 */
export async function reserveEmailDelivery() {
	const account = process.env.CLOUDFLARE_ACCOUNT_ID;
	if (!account) { throw new Error('Live email tests require CLOUDFLARE_ACCOUNT_ID.'); }
	const key = createHash('sha256').update(account).digest('hex').slice(0, 16);
	const directory = join(homedir(), '.cache', 'jessehattabaugh-com', 'email-tests', key, new Date().toISOString().slice(0, 10));
	await mkdir(directory, { recursive: true, mode: 0o700 });
	for (let slot = 0; slot < DAILY_EMAIL_TEST_LIMIT; slot++) {
		try {
			// Exclusive creation is the reservation; a crash cannot refund a send.
			// eslint-disable-next-line no-await-in-loop
			const handle = await open(join(directory, String(slot)), 'wx', 0o600);
			// eslint-disable-next-line no-await-in-loop
			await handle.close();
			return true;
		} catch (error) {
			if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'EEXIST') { throw error; }
		}
	}
	return false;
}
