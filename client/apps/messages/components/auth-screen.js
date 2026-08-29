import { api } from '../api.js';
import {
	parseRegistrationOptions,
	parseAuthenticationOptions,
	serializeRegistrationCredential,
	serializeAuthenticationCredential,
} from '../webauthn.js';

const template = document.createElement('template');
template.innerHTML = `
	<div class="auth-card">
		<img class="auth-card__icon" src="/apps/messages/icon.svg" alt="" width="80" height="80" />
		<h1>Messages</h1>
		<p>Send Jesse a message using a secure passkey — no password needed.</p>
		<p class="auth-error" role="alert" hidden></p>
		<label class="auth-label" for="auth-name"
			>Your name
			<input
				type="text"
				id="auth-name"
				name="displayName"
				autocomplete="name"
				placeholder="e.g. Alice"
				class="auth-input"
				required
			/>
		</label>
		<label class="auth-label" for="auth-email"
			>Email
			<input
				type="email"
				id="auth-email"
				name="email"
				autocomplete="email"
				placeholder="you@example.com"
				class="auth-input"
				required
			/>
		</label>
		<label class="auth-label auth-label--hidden" for="auth-token"
			>Setup token (owner only)
			<input
				type="password"
				id="auth-token"
				name="setupToken"
				autocomplete="off"
				class="auth-input"
				placeholder="Leave blank if not owner"
			/>
		</label>
		<button type="button" class="btn btn--primary auth-register">Register with Passkey</button>
		<div class="auth-divider" aria-hidden="true">or</div>
		<button type="button" class="btn btn--outline auth-login">Sign in with Passkey</button>
	</div>
`;

/**
 * <auth-screen> — Passkey registration and authentication UI.
 * Dispatches 'auth-success' with { user } on success.
 */
export class AuthScreen extends HTMLElement {
	connectedCallback() {
		this.#render();
	}

	#render() {
		this.replaceChildren(template.content.cloneNode(true));

		const nameInput = /** @type {HTMLInputElement} */ (this.querySelector('#auth-name'));
		const emailInput = /** @type {HTMLInputElement} */ (this.querySelector('#auth-email'));
		const tokenLabel = /** @type {HTMLLabelElement} */ (
			this.querySelector('label[for="auth-token"]')
		);
		const tokenInput = /** @type {HTMLInputElement} */ (this.querySelector('#auth-token'));
		this.#errorEl = /** @type {HTMLParagraphElement} */ (this.querySelector('.auth-error'));

		this.querySelector('.auth-register')?.addEventListener('click', () => {
			this.#withError(() => {
				return this.#register(nameInput.value, emailInput.value, tokenInput.value);
			});
		});

		this.querySelector('.auth-login')?.addEventListener('click', () => {
			this.#withError(() => {
				return this.#login();
			});
		});

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

	/** @param {string} displayName @param {string} email @param {string} setupToken */
	async #register(displayName, email, setupToken) {
		const trimmedName = displayName.trim();
		const trimmedEmail = email.trim();
		if (!trimmedName) {
			throw new Error('Please enter your name.');
		}
		if (!trimmedEmail) {
			throw new Error('Please enter your email address.');
		}

		const beginData = await api.registerBegin({
			displayName: trimmedName,
			email: trimmedEmail,
		});
		if (beginData.needsVerification) {
			throw new Error(
				'Check your email and confirm the link before registering your passkey.',
			);
		}
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
