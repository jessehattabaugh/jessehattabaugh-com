/** Enhance server-rendered Messages; never remove the baseline. */
import {
	parseRegistrationOptions, parseAuthenticationOptions,
	serializeRegistrationCredential, serializeAuthenticationCredential,
} from './webauthn.js';
import { setupPushForm } from '../../enhance/push.js';

const script = document.querySelector('script[data-service-worker]');
const workerUrl = script?.getAttribute('data-service-worker');
const scope = script?.getAttribute('data-scope');
const registration = workerUrl && scope && 'serviceWorker' in navigator
	? navigator.serviceWorker.register(workerUrl, { scope }).catch(() => null)
	: Promise.resolve(null);

/** @param {HTMLFormElement} form */
async function passkey(form) {
	const registering = form.dataset.passkey === 'register';
	const response = await fetch(form.action, { method: form.method, headers: { Accept: 'application/json' } });
	if (response.redirected) { location.assign(response.url); return; }
	if (!response.ok) { throw new Error('Could not start the passkey request. Use email sign-in instead.'); }
	const { options, challengeId } = await response.json();
	const credential = registering
		? await navigator.credentials.create({ publicKey: parseRegistrationOptions(options) })
		: await navigator.credentials.get({ publicKey: parseAuthenticationOptions(options) });
	if (!(credential instanceof window.PublicKeyCredential)) { throw new Error('No passkey was selected.'); }
	const complete = form.getAttribute('data-complete');
	if (!complete) { throw new Error('Missing credential control'); }
	const result = await fetch(complete, {
		method: form.method, headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
		body: JSON.stringify({ challengeId, credential: registering ? serializeRegistrationCredential(credential) : serializeAuthenticationCredential(credential) }),
	});
	if (result.redirected) { location.assign(result.url); return; }
	if (!result.ok || !result.headers.get('Content-Type')?.includes('application/json')) {
		throw new Error('The passkey request failed. Try again or use email sign-in.');
	}
	const data = await result.json();
	location.assign(data.location);
}

function initialize() {
	for (const form of document.querySelectorAll('form[data-passkey]')) {
		if (!(form instanceof HTMLFormElement) || !('PublicKeyCredential' in window) || !navigator.credentials || !('fetch' in window)) { continue; }
		form.hidden = false;
		if (form.dataset.ready) { continue; }
		form.dataset.ready = 'true';
		form.addEventListener('submit', async (event) => {
			event.preventDefault();
			try { await passkey(form); } catch (error) {
				const status = document.querySelector('[data-browser-status]');
				if (status) { status.textContent = error instanceof Error ? error.message : 'Use email sign-in instead.'; }
			}
		});
	}
	for (const form of document.querySelectorAll('form[data-push]')) {
		if (form instanceof HTMLFormElement) { setupPushForm(form, registration); }
	}
}
initialize();
document.addEventListener('fragment-loaded', initialize);

// Refresh only the history; never clobber a message someone is composing.
let polling = false;
setInterval(async () => {
	const link = document.querySelector('a[data-poll]');
	if (!(link instanceof HTMLAnchorElement) || document.hidden || polling || !('startViewTransition' in document)) { return; }
	polling = true;
	try {
		const response = await fetch(link.href, { headers: { 'X-Fragment': 'true' } });
		if (!response.ok || response.redirected) { return; }
		const parsed = new DOMParser().parseFromString(await response.text(), 'text/html');
		const next = parsed.querySelector('ol[aria-label="Messages"]');
		const current = document.querySelector('ol[aria-label="Messages"]');
		if (!next || !current || next.innerHTML === current.innerHTML || document.querySelector('a[data-poll]')?.getAttribute('href') !== link.getAttribute('href')) { return; }
		await document.startViewTransition(() => current.replaceChildren(...next.childNodes)).finished;
	} catch { /* The refresh link remains usable after a network failure. */ }
	finally { polling = false; }
}, 5000);
