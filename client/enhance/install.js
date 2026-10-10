/** Installation stays available through the browser menu when no prompt exists. */
export {};
/** @typedef {Event & { prompt(): Promise<void>, userChoice: Promise<{ outcome: string }> }} InstallEvent */
/** @type {InstallEvent | null} */
let installationRequest = null;

function reveal() {
	for (const button of document.querySelectorAll('[data-install]')) {
		if (button instanceof HTMLButtonElement) { button.hidden = !installationRequest; }
	}
}

window.addEventListener('beforeinstallprompt', (event) => {
	event.preventDefault();
	installationRequest = /** @type {InstallEvent} */ (event);
	reveal();
});
window.addEventListener('appinstalled', () => { installationRequest = null; reveal(); });
document.addEventListener('fragment-loaded', reveal);
document.addEventListener('click', async (event) => {
	const button = event.target instanceof Element ? event.target.closest('[data-install]') : null;
	if (!(button instanceof HTMLButtonElement) || !installationRequest) { return; }
	// Consume this prompt before yielding so a newer prompt cannot be cleared.
	const pending = installationRequest;
	installationRequest = null;
	reveal();
	try { await pending.prompt(); await pending.userChoice; }
	catch { /* Manual installation instructions remain visible. */ }
});
