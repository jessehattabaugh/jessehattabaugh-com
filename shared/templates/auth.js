import { html } from '../html.js';
import { layout } from './layout.js';
import { paths } from '../routes.js';

/**
 * @typedef {object} AuthData
 * @property {'login' | 'verify' | 'account'} [screen]
 * @property {{ id: string, display_name: string, is_owner: number } | null} [user]
 * @property {string} [error]
 * @property {string} [notice]
 * @property {string} [token]
 * @property {string} [returnTo]
 * @property {boolean} [canSetup]
 * @property {{ name?: string, email?: string }} [values]
 */

const titles = { login: 'Sign in', verify: 'Confirm your email', account: 'Your account' };

/** @param {AuthData} data */
function emailSignIn(data) {
	const returnTo = encodeURIComponent(data.returnTo ?? paths.account);
	const values = data.values ?? {};
	return html`
		<p>Use an email link to sign in on any device, with or without JavaScript.</p>
		<form method="post" action="${paths.login}?returnTo=${returnTo}" data-target="#main" aria-label="Email sign-in">
			<label for="login-name">Name</label>
			<input id="login-name" name="name" autocomplete="name" maxlength="100" required value="${values.name ?? ''}" />
			<label for="login-email">Email</label>
			<input id="login-email" name="email" type="email" autocomplete="email" required value="${values.email ?? ''}" />
			<button type="submit" class="btn">Email me a sign-in link</button>
		</form>
		<form method="post" action="${paths.loginBegin}?returnTo=${returnTo}" data-passkey="login" data-complete="${paths.loginComplete}?returnTo=${returnTo}" data-no-enhance hidden>
			<button type="submit" class="btn btn--outline">Sign in with a passkey</button>
		</form>`;
}

/** @param {AuthData} data */
function confirmation(data) {
	const returnTo = data.returnTo ?? paths.account;
	let destination = 'your account';
	if (returnTo === paths.lightsfinder) { destination = 'Lightsfinder'; }
	if (returnTo === paths.messages) { destination = 'Messages'; }
	return html`
		<p>Confirm to sign in and finish your request. This link can be used once.</p>
		${data.token ? html`
			<p>Continue to ${destination} after confirming.</p>
			<form method="post" action="${paths.verify}" data-no-enhance>
				<input type="hidden" name="token" value="${data.token}" />
				<button type="submit" class="btn">Confirm email</button>
			</form>` : html`<a href="${paths.login}?returnTo=${encodeURIComponent(returnTo)}">Request a new sign-in link</a>`}`;
}

/** @param {AuthData} data */
function accountControls(data) {
	if (!data.user) { return html``; }
	return html`
		<p>Signed in as ${data.user.display_name}.</p>
		<form method="post" action="${paths.logout}" data-no-enhance>
			<button type="submit" class="btn btn--outline">Sign out</button>
		</form>
		<nav aria-label="Your apps">
			<a href="${paths.lightsfinder}">Lightsfinder</a> ·
			<a href="${paths.messages}">Messages</a> ·
			<a href="${paths.rainbow}">Rainbow Hour</a>
		</nav>
		<form method="post" action="${paths.registerBegin}" data-passkey="register" data-complete="${paths.registerComplete}" data-no-enhance hidden>
			<button type="submit" class="btn btn--outline">Add a passkey</button>
		</form>
		${data.canSetup ? html`
			<details><summary>Set up the site owner</summary>
				<form method="post" action="${paths.setup}" data-target="#main">
					<label for="setup-token">Owner setup token</label>
					<input id="setup-token" name="setupToken" type="password" required />
					<button type="submit" class="btn">Become site owner</button>
				</form>
			</details>` : html``}
		<details><summary>Recovery email</summary>
			<p>Confirm an email address to sign in without a passkey on another device.</p>
			<form method="post" action="${paths.profile}" data-target="#main" aria-label="Recovery email">
				<label for="recovery-email">Recovery email</label>
				<input id="recovery-email" name="email" type="email" autocomplete="email" required value="${data.values?.email ?? ''}" />
				<button type="submit" class="btn">Confirm recovery email</button>
			</form>
		</details>`;
}

/** @param {AuthData} [data] */
export function authFragment(data = {}) {
	const { screen = 'login', error, notice } = data;
	return html`<article>
		<h1>${titles[screen]}</h1>
		<p>One jessehattabaugh.com account for all apps.</p>
		${error ? html`<p role="alert">${error}</p>` : html``}
		${notice ? html`<p role="status">${notice}</p>` : html``}
		${screen === 'verify' ? confirmation(data) : html``}
		${screen === 'login' ? emailSignIn(data) : html``}
		${screen === 'account' ? accountControls(data) : html``}
		<p role="status" aria-label="Browser features" data-browser-status></p>
	</article>`;
}

/** @param {AuthData} [data] */
export function authPage(data = {}) {
	const screen = data.screen ?? 'login';
	const screenPaths = { login: paths.login, verify: paths.verify, account: paths.account };
	return layout({
		title: titles[screen], path: screenPaths[screen],
		description: 'Sign in to your jessehattabaugh.com account for all apps.',
		viewTransitions: false,
		body: authFragment(data),
		scripts: html`<script type="module" src="/enhance/auth.js"></script>`,
	});
}
