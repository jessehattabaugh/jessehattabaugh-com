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
		this.innerHTML = '';
		const banner = document.createElement('div');
		banner.className = 'install-banner';
		banner.setAttribute('role', 'region');
		banner.setAttribute('aria-label', 'Install app');

		const msg = document.createElement('p');
		msg.textContent = 'Install this app for quick access and notifications.';

		const installBtn = document.createElement('button');
		installBtn.type = 'button';
		installBtn.className = 'btn';
		installBtn.textContent = 'Install';
		installBtn.addEventListener('click', () => {
			this.#install();
		});

		const dismissBtn = document.createElement('button');
		dismissBtn.type = 'button';
		dismissBtn.className = 'btn btn--ghost';
		dismissBtn.setAttribute('aria-label', 'Dismiss');
		dismissBtn.textContent = '✕';
		dismissBtn.addEventListener('click', () => {
			this.remove();
		});

		banner.append(msg, installBtn, dismissBtn);
		this.append(banner);
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
