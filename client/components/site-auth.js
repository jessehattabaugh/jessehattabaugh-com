import { parseRegistrationOptions, parseAuthenticationOptions, serializeRegistrationCredential, serializeAuthenticationCredential } from './webauthn.js';

/** @param {HTMLFormElement} form */
async function passkey(form) {
	const registering = form.dataset.passkey === 'register';
	const response = await fetch(form.action, { method: form.method, headers: { Accept: 'application/json' }, body: new FormData(form) });
	if (response.redirected) { location.assign(response.url); return; }
	if (!response.ok) { throw new Error('Could not start the passkey request. Use email sign-in instead.'); }
	const { options, challengeId, returnTo } = await response.json();
	const credential = registering
		? await navigator.credentials.create({ publicKey: parseRegistrationOptions(options) })
		: await navigator.credentials.get({ publicKey: parseAuthenticationOptions(options) });
	if (!(credential instanceof window.PublicKeyCredential)) { throw new Error('No passkey was selected.'); }
	const complete = form.getAttribute('data-complete');
	if (!complete) { throw new Error('Missing credential control'); }
	const result = await fetch(complete, {
		method: form.method, headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
		body: JSON.stringify({ challengeId, returnTo, credential: registering ? serializeRegistrationCredential(credential) : serializeAuthenticationCredential(credential) }),
	});
	if (result.redirected) { location.assign(result.url); return; }
	if (!result.ok || !result.headers.get('Content-Type')?.includes('application/json')) {
		throw new Error('The passkey request failed. Try again or use email sign-in.');
	}
	const data = await result.json();
	location.assign(data.location);
}


class AccountControl extends HTMLElement {
	connectedCallback() {
		for (const form of this.querySelectorAll('form[data-passkey]')) {
			if (!(form instanceof HTMLFormElement) || !('PublicKeyCredential' in window) || !navigator.credentials || !('fetch' in window)) { continue; }
			form.hidden = false;
			if (form.dataset.ready) { continue; }
			form.dataset.ready = 'true';
			form.addEventListener('submit', async (event) => {
				event.preventDefault();
				try { await passkey(form); } catch (error) {
					const status = this.querySelector('[data-auth-status]');
					if (status) { status.textContent = error instanceof Error ? error.message : 'Use email sign-in instead.'; }
				}
			});
		}
	}
}
for (const tag of ['site-account', 'account-settings', 'email-sign-in']) {
	if (!customElements.get(tag)) { customElements.define(tag, class extends AccountControl {}); }
}
