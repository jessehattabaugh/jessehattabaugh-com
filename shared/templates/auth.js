import { html } from '../html.js';
import { layout } from './layout.js';
import { paths } from '../routes.js';
import { accountSettings } from './account.js';

/**
 * @typedef {object} AuthData
 * @property {'login' | 'verify' | 'profile'} [screen]
 * @property {{display_name: string} | null} [user]
 * @property {string} [error]
 * @property {string} [notice]
 * @property {string} [token]
 * @property {string} [returnTo]
 * @property {{name?: string, email?: string}} [values]
 */

/** @param {AuthData} data */
function heading(data) {
	if (data.screen === 'verify') { return 'Confirm your email'; }
	if (data.screen === 'profile') { return 'Your account'; }
	return 'Sign in';
}

/** @param {AuthData} data */
function content(data) {
	const { screen = 'login', values = {}, returnTo = paths.messages } = data;
	if (screen === 'profile') { return accountSettings({ user: data.user, email: values.email, canRegister: true, canUpdateEmail: true, returnTo }); }
	if (screen === 'verify') { return html`
		<p>Confirm your email to sign in across Jesse’s apps, read your conversation, and notify Jesse of your verified message. This link can be used once.</p>
		${data.token ? html`<form method="post" action="${paths.verify}" data-no-enhance>
			<input type="hidden" name="token" value="${data.token}" />
			<button type="submit" class="btn">Confirm email</button>
		</form>` : html`<a href="${paths.login}">Request a new sign-in link</a>`}
	`; }
	return html`
			<p>One account for all of Jesse’s apps. Use an email link to sign in on any device.</p>
			<email-sign-in>
				<form method="post" action="${paths.login}" data-target="#main" aria-label="Email sign-in">
					<input type="hidden" name="returnTo" value="${returnTo}" />
					<label for="login-name">Name</label>
					<input id="login-name" name="name" autocomplete="name" maxlength="100" required value="${values.name ?? ''}" />
					<label for="login-email">Email</label>
					<input id="login-email" name="email" type="email" autocomplete="email" required value="${values.email ?? ''}" />
					<button type="submit" class="btn">Email me a sign-in link</button>
				</form>
				<form method="post" action="${paths.loginBegin}" data-passkey="login" data-complete="${paths.loginComplete}" data-no-enhance hidden>
					<input type="hidden" name="returnTo" value="${returnTo}" />
					<button type="submit" class="btn btn--outline">Sign in with a passkey</button>
				</form>
				<p role="status" aria-label="Account features" data-auth-status></p>
			</email-sign-in>
	`;
}

/** @param {AuthData} data */
export function authFragment(data = {}) {
	return html`<article>
		<h1>${heading(data)}</h1>
		${data.error ? html`<p role="alert">${data.error}</p>` : html``}
		${data.notice ? html`<p role="status">${data.notice}</p>` : html``}
		${content(data)}
	</article>`;
}

/** @param {AuthData} data */
export function authPage(data = {}) {
	return layout({ title: heading(data),
		path: ({ verify: paths.verify, profile: paths.profile, login: paths.login })[data.screen ?? 'login'],
		user: data.user, body: authFragment(data),
	});
}
