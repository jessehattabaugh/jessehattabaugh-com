/** Fill missing runtime secrets in .dev.vars; never rotate existing values.
 * Remote secrets are updated separately using npm run secrets:upload. */
import { webcrypto } from 'node:crypto';
import { readFileSync, writeFileSync, chmodSync, existsSync } from 'node:fs';
import { localVariables } from './environment.js';

const file = new URL('../.dev.vars', import.meta.url);
let source = existsSync(file) ? readFileSync(file, 'utf8') : readFileSync(new URL('../.dev.vars.example', import.meta.url), 'utf8');
/** @type {Record<string,string>} */
const generated = {};
if (!!localVariables.VAPID_PUBLIC_KEY !== !!localVariables.VAPID_PRIVATE_KEY) {
	throw new Error('The VAPID key pair is incomplete in .dev.vars. Restore the matching key before generating anything.');
}
if (!localVariables.VAPID_PUBLIC_KEY && !localVariables.VAPID_PRIVATE_KEY) {
	const pair = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
	generated.VAPID_PUBLIC_KEY = Buffer.from(await webcrypto.subtle.exportKey('raw', pair.publicKey)).toString('base64url');
	generated.VAPID_PRIVATE_KEY = Buffer.from(await webcrypto.subtle.exportKey('pkcs8', pair.privateKey)).toString('base64url');
}
if (!localVariables.SESSION_SECRET) { generated.SESSION_SECRET = Buffer.from(webcrypto.getRandomValues(new Uint8Array(32))).toString('base64url'); }
if (!localVariables.OWNER_SETUP_TOKEN) { generated.OWNER_SETUP_TOKEN = Buffer.from(webcrypto.getRandomValues(new Uint8Array(16))).toString('hex'); }
for (const [name, value] of Object.entries(generated)) {
	const pattern = new RegExp(`^${name}=.*$`, 'm');
	source = pattern.test(source) ? source.replace(pattern, `${name}=${value}`) : `${source}\n${name}=${value}\n`;
}
writeFileSync(file, source, { mode: 0o600 });
chmodSync(file, 0o600);
console.log(`Saved ${Object.keys(generated).length} missing runtime secrets to .dev.vars; existing values preserved.`);
