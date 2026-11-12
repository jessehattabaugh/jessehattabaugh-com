export {};

const panel = document.getElementById('demo-panel');
if (panel) {
	const status = document.querySelector('[aria-label="Disclosure state"]');
	panel.addEventListener('disclosure-change', (event) => {
		if (status && event instanceof CustomEvent) {
			status.textContent = event.detail.open ? 'Panel opened (disclosure-change).' : 'Panel closed (disclosure-change).';
		}
	});
	// Observe initialization too: a static import would upgrade existing markup
	// before this listener could verify the component's silent-upgrade contract.
	await import('../index.js');
	const close = panel.querySelector('[data-close-panel]');
	if (close instanceof HTMLButtonElement) {
		close.addEventListener('click', () => {
			// Move focus to the summary before hiding the focused button.
			panel.querySelector('summary')?.focus();
			close.dispatchEvent(new CustomEvent('disclosure-request', {
				detail: { open: false }, bubbles: true, composed: true,
			}));
		});
		close.hidden = false;
	}
	document.querySelector('[data-open-panel]')?.addEventListener('click', () => { panel.setAttribute('open', ''); });
	document.querySelector('[data-remove-open]')?.addEventListener('click', () => { panel.removeAttribute('open'); });
	const controls = document.querySelector('[data-demo-controls]');
	if (controls instanceof HTMLElement) { controls.hidden = false; }
}
