/** Convert Uint8Array to base64url string (no padding). */
/** @param {Uint8Array} bytes */
export function toBase64url(bytes) {
	let binary = '';
	const chunk = 8192;
	for (let i = 0; i < bytes.length; i += chunk) {
		binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
	}
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/** Convert base64url string to Uint8Array. */
/** @param {string} b64 */
export function fromBase64url(b64) {
	const padded =
		b64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64.length % 4)) % 4);
	return Uint8Array.from(atob(padded), (c) => {
		return c.charCodeAt(0);
	});
}
