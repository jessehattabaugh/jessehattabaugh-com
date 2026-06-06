import { html } from '../html.js';
import { layout } from './layout.js';

/**
 * @param {object} opts
 * @param {string} opts.challenge
 * @param {string} opts.credentialId
 * @param {string} opts.rpId
 * @param {string} [opts.error]
 * @returns {import('../html.js').Raw}
 */
export const contactSubmissionsAuth = ({ challenge, credentialId, rpId, error }) => {
	return layout({
		title: 'Contact Submissions',
		body: html`
			<article>
				<h1>Contact submissions</h1>
				<p>Authenticate with your security key to view submissions.</p>
				${error ? html`<p class="error" role="alert">${error}</p>` : html``}
				<form method="post" action="/admin/contact-submissions/auth" data-no-enhance="true">
					<input type="hidden" name="challenge" value="${challenge}" />
					<input type="hidden" name="rpId" value="${rpId}" />
					<input type="hidden" name="credentialId" value="${credentialId}" />
					<input type="hidden" name="clientDataJSON" value="" />
					<input type="hidden" name="authenticatorData" value="" />
					<input type="hidden" name="signature" value="" />
					<button type="submit">Authenticate with WebAuthn</button>
				</form>
				<p class="sr-only" id="auth-status" aria-live="polite"></p>
				<noscript>
					<p class="error">JavaScript is required for WebAuthn authentication.</p>
				</noscript>
			</article>
			<script>
				(() => {
				const form = document.querySelector('form[action="/admin/contact-submissions/auth"]');
				if (!form || !window.PublicKeyCredential || !navigator.credentials) {
				return;
				}

				const status = document.getElementById('auth-status');

				const fromBase64Url = (value) => {
				const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
				const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
				const binary = atob(padded);
				return Uint8Array.from(binary, (c) => c.charCodeAt(0));
				};

				const toBase64Url = (value) => {
				const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
				let binary = '';
				for (const byte of bytes) {
				binary += String.fromCharCode(byte);
				}
				return btoa(binary).replace(/+/g, '-').replace(///g, '_').replace(/=+$/g, '');
				};

				form.addEventListener('submit', async (event) => {
				event.preventDefault();
				status.textContent = 'Waiting for security key...';

				try {
				const challengeValue = form.elements.challenge.value;
				const rpIdValue = form.elements.rpId.value;
				const credentialIdValue = form.elements.credentialId.value;
				const assertion = await navigator.credentials.get({
				publicKey: {
				challenge: fromBase64Url(challengeValue),
				rpId: rpIdValue,
				userVerification: 'preferred',
				allowCredentials: [
				{
				type: 'public-key',
				id: fromBase64Url(credentialIdValue),
				},
				],
				},
				});

				if (!assertion || assertion.type !== 'public-key') {
				throw new Error('No credential returned');
				}

				const response = assertion.response;
				form.elements.clientDataJSON.value = toBase64Url(response.clientDataJSON);
				form.elements.authenticatorData.value = toBase64Url(response.authenticatorData);
				form.elements.signature.value = toBase64Url(response.signature);
				form.elements.credentialId.value = toBase64Url(assertion.rawId);
				form.submit();
				} catch {
				status.textContent = 'Authentication failed. Please try again.';
				}
				});
				})();
			</script>
		`,
	});
};

/**
 * @param {object} opts
 * @param {Array<{ id: number, name: string, email: string, message: string, created_at: string }>} opts.messages
 * @returns {import('../html.js').Raw}
 */
export const contactSubmissionsList = ({ messages }) => {
	return layout({
		title: 'Contact Submissions',
		body: html`
			<article>
				<h1>Contact submissions</h1>
				${messages.length === 0
					? html`<p>No messages yet.</p>`
					: html`
							<ul class="submission-list">
								${messages.map((message) => {
									return html`
										<li>
											<h2>${message.name}</h2>
											<p><strong>Email:</strong> ${message.email}</p>
											<p><strong>Received:</strong> ${message.created_at}</p>
											<p>${message.message}</p>
											<form
												method="post"
												action="/admin/contact-submissions/delete"
												data-no-enhance="true"
											>
												<input
													type="hidden"
													name="id"
													value="${message.id}"
												/>
												<button type="submit">Delete</button>
											</form>
										</li>
									`;
								})}
							</ul>
						`}
				<form
					method="post"
					action="/admin/contact-submissions/logout"
					data-no-enhance="true"
				>
					<button type="submit">Log out</button>
				</form>
			</article>
		`,
	});
};
