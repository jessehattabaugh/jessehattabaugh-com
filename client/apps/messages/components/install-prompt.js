const template = document.createElement('template');
template.innerHTML = `
	<div class="install-banner" role="region" aria-label="Install app">
		<p>Install this app for quick access and notifications.</p>
		<button type="button" class="btn install-banner__install">Install</button>
		<button type="button" class="btn btn--ghost install-banner__dismiss" aria-label="Dismiss">✕</button>
	</div>
`;

/**
 * <install-prompt> — Shows a banner if the app isn't installed.
 * Uses the beforeinstallprompt event (Chrome/Edge) or shows a manual guide.
 */

/**
 * @typedef {{ prompt(): void, userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }} BeforeInstallPromptEvent
 */

export class InstallPrompt extends HTMLElement {
	/** @type {BeforeInstallPromptEvent | null} */
	#deferredPrompt = null;

	connectedCallback() {
		// Already installed (standalone mode)
		if (
			window.matchMedia('(display-mode: standalone)').matches ||
			/** @type {any} */ (window.navigator).standalone
		) {
			return;
		}

		window.addEventListener('beforeinstallprompt', (e) => {
			e.preventDefault();
			this.#deferredPrompt = /** @type {any} */ (e);
			this.#render();
		});
	}

	#render() {
		this.replaceChildren(template.content.cloneNode(true));

		this.querySelector('.install-banner__install')?.addEventListener('click', () => {
			this.#install();
		});
		this.querySelector('.install-banner__dismiss')?.addEventListener('click', () => {
			this.remove();
		});
	}

	async #install() {
		if (!this.#deferredPrompt) {
			return;
		}
		this.#deferredPrompt.prompt();
		const { outcome } = await this.#deferredPrompt.userChoice;
		if (outcome === 'accepted') {
			this.remove();
		}
		this.#deferredPrompt = null;
	}
}

customElements.define('install-prompt', InstallPrompt);
