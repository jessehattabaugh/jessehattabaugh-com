/** Client-side WebAuthn helpers: encoding, option preparation, response serialization. */

/** @param {ArrayBuffer | ArrayBufferView} buf */
export function bufToBase64url(buf) {
	const bytes =
		buf instanceof ArrayBuffer
			? new Uint8Array(buf)
			: new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
	let binary = '';
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/** @param {string} b64url */
export function base64urlToBuf(b64url) {
	const padded =
		b64url.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64url.length % 4)) % 4);
	const binary = atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes.buffer;
}

/**
 * Convert server-side registration options (base64url strings) to
 * the ArrayBuffer form required by navigator.credentials.create().
 * @param {object} serverOptions
 * @returns {PublicKeyCredentialCreationOptions}
 */
export function parseRegistrationOptions(serverOptions) {
	const opts = /** @type {any} */ (serverOptions);
	return {
		...opts,
		challenge: base64urlToBuf(opts.challenge),
		user: {
			...opts.user,
			id:
				typeof opts.user.id === 'string'
					? new TextEncoder().encode(opts.user.id)
					: base64urlToBuf(opts.user.id),
		},
		excludeCredentials: (opts.excludeCredentials ?? []).map((/** @type {any} */ c) => {
			return { ...c, id: base64urlToBuf(c.id) };
		}),
	};
}

/**
 * Convert server-side authentication options to the ArrayBuffer form.
 * @param {object} serverOptions
 * @returns {PublicKeyCredentialRequestOptions}
 */
export function parseAuthenticationOptions(serverOptions) {
	const opts = /** @type {any} */ (serverOptions);
	return {
		...opts,
		challenge: base64urlToBuf(opts.challenge),
		allowCredentials: (opts.allowCredentials ?? []).map((/** @type {any} */ c) => {
			return { ...c, id: base64urlToBuf(c.id) };
		}),
	};
}

/**
 * Serialize a PublicKeyCredential (registration) for JSON transport.
 * @param {PublicKeyCredential} credential
 */
export function serializeRegistrationCredential(credential) {
	const { response: rawResponse } = credential;
	const response = /** @type {AuthenticatorAttestationResponse} */ (rawResponse);
	return {
		id: credential.id,
		rawId: bufToBase64url(credential.rawId),
		type: credential.type,
		authenticatorAttachment: credential.authenticatorAttachment,
		clientExtensionResults: credential.getClientExtensionResults(),
		response: {
			clientDataJSON: bufToBase64url(response.clientDataJSON),
			attestationObject: bufToBase64url(response.attestationObject),
			transports: response.getTransports?.() ?? [],
		},
	};
}

/**
 * Serialize a PublicKeyCredential (authentication) for JSON transport.
 * @param {PublicKeyCredential} credential
 */
export function serializeAuthenticationCredential(credential) {
	const { response: rawResponse } = credential;
	const response = /** @type {AuthenticatorAssertionResponse} */ (rawResponse);
	return {
		id: credential.id,
		rawId: bufToBase64url(credential.rawId),
		type: credential.type,
		authenticatorAttachment: credential.authenticatorAttachment,
		clientExtensionResults: credential.getClientExtensionResults(),
		response: {
			clientDataJSON: bufToBase64url(response.clientDataJSON),
			authenticatorData: bufToBase64url(response.authenticatorData),
			signature: bufToBase64url(response.signature),
			userHandle: response.userHandle ? bufToBase64url(response.userHandle) : undefined,
		},
	};
}
