/** Enhance server-rendered Messages; never remove the baseline. */
import { setupPushForm } from '../../enhance/push.js';

const script = document.querySelector('script[data-service-worker]');
const workerUrl = script?.getAttribute('data-service-worker');
const scope = script?.getAttribute('data-scope');
const registration = workerUrl && scope && 'serviceWorker' in navigator
	? navigator.serviceWorker.register(workerUrl, { scope }).catch(() => {return null})
	: Promise.resolve(null);

function initialize() {
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
		await document.startViewTransition(() => {return current.replaceChildren(...next.childNodes)}).finished;
	} catch { /* The refresh link remains usable after a network failure. */ }
	finally {
		// The synchronous guard above allows only one poll to own this flag.
		// eslint-disable-next-line require-atomic-updates
		polling = false;
	}
}, 5000);
