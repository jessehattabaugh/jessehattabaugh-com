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

/**
 * Convert a DER-encoded ECDSA signature to raw r||s bytes.
 * @param {Uint8Array} der
 * @param {number} scalarSize  Size in bytes of each ECDSA scalar (32 for P-256)
 * @returns {Uint8Array}
 */
export function ecdsaDerToRaw(der, scalarSize = 32) {
	if (der.length < 8 || der[0] !== 0x30) {
		throw new Error('Invalid ECDSA DER signature');
	}

	let offset = 1;
	let sequenceLength = der[offset++];
	if (sequenceLength === 0x81) {
		if (offset >= der.length) {
			throw new Error('Invalid ECDSA DER signature length');
		}
		sequenceLength = der[offset++];
	}
	if (offset + sequenceLength !== der.length) {
		throw new Error('Invalid ECDSA DER signature size');
	}

	if (der[offset++] !== 0x02 || offset >= der.length) {
		throw new Error('Invalid ECDSA DER integer (r)');
	}
	const rLength = der[offset++];
	if (rLength === 0 || offset + rLength > der.length) {
		throw new Error('Invalid ECDSA DER r length');
	}
	const r = der.slice(offset, offset + rLength);
	offset += rLength;

	if (der[offset++] !== 0x02 || offset >= der.length) {
		throw new Error('Invalid ECDSA DER integer (s)');
	}
	const sLength = der[offset++];
	if (sLength === 0 || offset + sLength !== der.length) {
		throw new Error('Invalid ECDSA DER s length');
	}
	const s = der.slice(offset, offset + sLength);

	const raw = new Uint8Array(scalarSize * 2);
	const cleanR = r[0] === 0 ? r.slice(1) : r;
	const cleanS = s[0] === 0 ? s.slice(1) : s;
	if (cleanR.length > scalarSize || cleanS.length > scalarSize) {
		throw new Error('Invalid ECDSA DER integer width');
	}
	raw.set(cleanR, scalarSize - cleanR.length);
	raw.set(cleanS, scalarSize * 2 - cleanS.length);
	return raw;
}
