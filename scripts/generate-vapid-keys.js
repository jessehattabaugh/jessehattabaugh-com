/**
 * Generate VAPID key pair and SESSION_SECRET for the messaging app.
 * Run once: node scripts/generate-vapid-keys.js
 * Then set with: wrangler secret put VAPID_PUBLIC_KEY, etc.
 */

/** @param {ArrayBuffer | Uint8Array} buf */
function toBase64url(buf) {
	const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
	return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('base64url');
}

async function main() {
	const { webcrypto } = await import('node:crypto');

	// Generate VAPID key pair (ECDSA P-256 — used for both signing JWTs and identifying the server)
	const keyPair = await webcrypto.subtle.generateKey(
		{ name: 'ECDSA', namedCurve: 'P-256' },
		true,
		['sign', 'verify'],
	);
	const publicKeyRaw = await webcrypto.subtle.exportKey('raw', keyPair.publicKey);
	const privateKeyPkcs8 = await webcrypto.subtle.exportKey('pkcs8', keyPair.privateKey);

	// Generate SESSION_SECRET (32 random bytes)
	const sessionSecret = webcrypto.getRandomValues(new Uint8Array(32));

	// Generate OWNER_SETUP_TOKEN (16 random bytes → readable hex)
	const ownerToken = Buffer.from(webcrypto.getRandomValues(new Uint8Array(16))).toString('hex');

	console.log('\nSet these Cloudflare secrets (wrangler secret put <NAME>):\n');
	console.log('VAPID_PUBLIC_KEY=', toBase64url(publicKeyRaw));
	console.log('VAPID_PRIVATE_KEY=', toBase64url(privateKeyPkcs8));
	console.log('SESSION_SECRET=', toBase64url(sessionSecret));
	console.log('OWNER_SETUP_TOKEN=', ownerToken);
	console.log('\n');
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
