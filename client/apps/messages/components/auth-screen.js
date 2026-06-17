import { api } from '../api.js';
import {
	parseRegistrationOptions,
	parseAuthenticationOptions,
	serializeRegistrationCredential,
	serializeAuthenticationCredential,
} from '../webauthn.js';

/**
 * <auth-screen> — Passkey registration and authentication UI.
 * Dispatches 'auth-success' with { user } on success.
 */
export class AuthScreen extends HTMLElement {
	connectedCallback() {
		this.#render();
	}

	#render() {
		this.className = 'auth-screen';
		this.innerHTML = '';

		const card = document.createElement('div');
		card.className = 'auth-card';

		// Icon
		const icon = document.createElement('img');
		icon.src = '/apps/messages/icon.svg';
		icon.alt = '';
		icon.className = 'auth-card__icon';
		icon.width = 80;
		icon.height = 80;

		const h1 = document.createElement('h1');
		h1.textContent = 'Messages';

		const p = document.createElement('p');
		p.textContent = 'Send Jesse a message using a secure passkey — no password needed.';

		// Name input
		const label = document.createElement('label');
		label.className = 'auth-label';
		label.htmlFor = 'auth-name';
		label.textContent = 'Your name';
		const nameInput = document.createElement('input');
		nameInput.type = 'text';
		nameInput.id = 'auth-name';
		nameInput.name = 'displayName';
		nameInput.autocomplete = 'name';
		nameInput.placeholder = 'e.g. Alice';
		nameInput.className = 'auth-input';
		nameInput.required = true;
		label.append(nameInput);

		// Setup token input (hidden, for Jesse)
		const tokenLabel = document.createElement('label');
		tokenLabel.className = 'auth-label auth-label--hidden';
		tokenLabel.htmlFor = 'auth-token';
		tokenLabel.textContent = 'Setup token (owner only)';
		const tokenInput = document.createElement('input');
		tokenInput.type = 'password';
		tokenInput.id = 'auth-token';
		tokenInput.name = 'setupToken';
		tokenInput.autocomplete = 'off';
		tokenInput.className = 'auth-input';
		tokenInput.placeholder = 'Leave blank if not owner';
		tokenLabel.append(tokenInput);

		const registerBtn = document.createElement('button');
		registerBtn.type = 'button';
		registerBtn.className = 'btn btn--primary';
		registerBtn.textContent = 'Register with Passkey';
		registerBtn.addEventListener('click', () => {
			this.#withError(() => {
				return this.#register(nameInput.value, tokenInput.value);
			});
		});

		const divider = document.createElement('div');
		divider.className = 'auth-divider';
		divider.setAttribute('aria-hidden', 'true');
		divider.textContent = 'or';

		const loginBtn = document.createElement('button');
		loginBtn.type = 'button';
		loginBtn.className = 'btn btn--outline';
		loginBtn.textContent = 'Sign in with Passkey';
		loginBtn.addEventListener('click', () => {
			this.#withError(() => {
				return this.#login();
			});
		});

		this.#errorEl = document.createElement('p');
		this.#errorEl.className = 'auth-error';
		this.#errorEl.setAttribute('role', 'alert');
		this.#errorEl.hidden = true;

		card.append(icon, h1, p, this.#errorEl, label, tokenLabel, registerBtn, divider, loginBtn);
		this.append(card);

		// Toggle token field when name has special trigger (dev UX)
		nameInput.addEventListener('input', () => {
			tokenLabel.classList.toggle(
				'auth-label--hidden',
				nameInput.value.toLowerCase() !== 'jesse',
			);
		});
	}

	/** @type {HTMLParagraphElement} */
	#errorEl = /** @type {any} */ (null);

	/** @param {() => Promise<void>} fn */
	async #withError(fn) {
		this.#errorEl.hidden = true;
		const btns = this.querySelectorAll('button');
		btns.forEach((b) => {
			b.disabled = true;
		});
		try {
			await fn();
		} catch (e) {
			this.#errorEl.textContent = e instanceof Error ? e.message : String(e);
			this.#errorEl.hidden = false;
		} finally {
			btns.forEach((b) => {
				b.disabled = false;
			});
		}
	}

	/** @param {string} displayName @param {string} setupToken */
	async #register(displayName, setupToken) {
		const trimmedName = displayName.trim();
		if (!trimmedName) {
			throw new Error('Please enter your name.');
		}

		const beginData = await api.registerBegin({ displayName: trimmedName });
		const options = parseRegistrationOptions(beginData.options);

		let credential;
		try {
			credential = /** @type {PublicKeyCredential} */ (
				await navigator.credentials.create({ publicKey: options })
			);
		} catch (e) {
			throw new Error('Passkey creation cancelled or failed. Please try again.', {
				cause: e,
			});
		}
		if (!credential) {
			throw new Error('No credential returned.');
		}

		const user = await api.registerComplete({
			challengeId: beginData.challengeId,
			userId: beginData.userId,
			displayName: trimmedName,
			setupToken: setupToken || undefined,
			credential: serializeRegistrationCredential(credential),
		});

		this.#onSuccess(user.user);
	}

	async #login() {
		const beginData = await api.loginBegin();
		const options = parseAuthenticationOptions(beginData.options);

		let credential;
		try {
			credential = /** @type {PublicKeyCredential} */ (
				await navigator.credentials.get({ publicKey: options })
			);
		} catch (e) {
			throw new Error('Sign-in cancelled or no passkey found. Try registering first.', {
				cause: e,
			});
		}
		if (!credential) {
			throw new Error('No credential returned.');
		}

		const result = await api.loginComplete({
			challengeId: beginData.challengeId,
			credential: serializeAuthenticationCredential(credential),
		});

		this.#onSuccess(result.user);
	}

	/** @param {{ id: string, displayName: string, isOwner: boolean }} user */
	#onSuccess(user) {
		this.dispatchEvent(new CustomEvent('auth-success', { detail: { user }, bubbles: true }));
	}
}

customElements.define('auth-screen', AuthScreen);
