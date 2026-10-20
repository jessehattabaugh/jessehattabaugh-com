import { html } from '../html.js';
import { paths } from '../routes.js';

/** Server-rendered light DOM keeps shared account components usable without JS.
 * @param {{ user?: {display_name: string} | null, returnTo?: string }} data
 */
export function siteAccount({ user, returnTo = paths.messages }) {
	return html`<site-account><nav aria-label="Site account">
		<a href="${paths.home}" aria-label="Jesse Hattabaugh home" title="Jesse Hattabaugh"><img src="${paths.avatar}" alt="Bluesky avatar" width="36" height="36" /></a>
		${user ? html`<p>Signed in as ${user.display_name}.</p><a href="${paths.profile}?returnTo=${encodeURIComponent(returnTo)}">Your account</a><form method="post" action="${paths.logout}" data-no-enhance><input type="hidden" name="returnTo" value="${returnTo}" /><button type="submit">Sign out</button></form>` : html`<span>Signed out</span><a href="${paths.login}?returnTo=${encodeURIComponent(returnTo)}">Sign in</a>`}
	</nav></site-account>`;
}

/** @param {{ returnTo?: string, label: string, explanation?: string, button?: boolean }} data */
export function signInLink({ returnTo = paths.messages, label, explanation = '', button = false }) {
	return html`<email-sign-in><p><a href="${paths.login}?returnTo=${encodeURIComponent(returnTo)}" ${button ? html`data-button` : html``}>${label}</a>${explanation}</p></email-sign-in>`;
}

/** @param {{ user?: {display_name: string} | null, email?: string, canRegister?: boolean, canUpdateEmail?: boolean, canSetup?: boolean, returnTo?: string }} data */
export function accountSettings({ user, email = '', canRegister, canUpdateEmail, canSetup, returnTo = paths.messages }) {
	return html`<account-settings>
				${canSetup ? html`
					<details><summary>Set up the site owner</summary>
						<form method="post" action="${paths.setup}" data-target="#main">
							<label for="setup-token">Owner setup token</label>
							<input id="setup-token" name="setupToken" type="password" required />
							<button type="submit" class="btn">Become site owner</button>
						</form>
					</details>` : html``}
		${user && canRegister ? html`<form method="post" action="${paths.registerBegin}" data-passkey="register" data-complete="${paths.registerComplete}" data-no-enhance hidden>
			<input type="hidden" name="returnTo" value="${returnTo}" />
			<button type="submit" class="btn btn--outline">Add a passkey</button>
		</form>` : html``}
		${user && canUpdateEmail ? html`<details><summary>Recovery email</summary>
			<p>Confirm an email address to sign in to all apps on another device.</p>
			<form method="post" action="${paths.profile}" data-no-enhance aria-label="Recovery email">
				<input type="hidden" name="returnTo" value="${returnTo}" />
				<label for="recovery-email">Recovery email</label>
				<input id="recovery-email" name="email" type="email" autocomplete="email" required value="${email}" />
				<button type="submit" class="btn">Confirm recovery email</button>
			</form>
		</details>` : html``}
		<p role="status" aria-label="Account features" data-auth-status></p>
	</account-settings>`;
}
