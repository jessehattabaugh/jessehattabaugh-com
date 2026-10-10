/** Browser push is optional; its server affordance is a real form. */

/** @param {string} value */
function publicKey(value) {
	const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
	return Uint8Array.from(atob(padded), (character) => {return character.charCodeAt(0)});
}

/**
 * @param {HTMLFormElement} form
 * @param {Promise<ServiceWorkerRegistration | null>} registration
 * @param {() => Promise<Record<string, string>>} [extra]
 * @param {() => Promise<void>} [onUnsubscribe]
 */
export function setupPushForm(form, registration, extra = async () => {return {}}, onUnsubscribe = async () => {}) {
	if (!('PushManager' in window) || !('Notification' in window) || !('serviceWorker' in navigator) || !('fetch' in window) || !('FormData' in window)) { return; }
	const button = form.querySelector('button');
	if (!button || form.dataset.ready) { return; }
	form.dataset.ready = 'true';
	const enableLabel = button.textContent ?? 'Enable notifications';
	/** @param {boolean} enabled */
	function reflect(enabled) {
		button?.setAttribute('aria-pressed', String(enabled));
		if (button) { button.textContent = enabled ? 'Disable notifications' : enableLabel; }
	}
	registration.then(async (reg) => {
		if (!reg) { return; }
		button.disabled = true;
		form.hidden = false;
		try {
			const subscription = await reg.pushManager.getSubscription();
			if (!subscription) { reflect(false); button.disabled = false; return; }
			// A service-worker subscription belongs to the browser, not its signed-in
			// user. Check the server before claiming this account receives alerts.
			const body = new FormData(form);
			body.set('endpoint', subscription.endpoint);
			body.set('operation', 'status');
			const response = await fetch(form.getAttribute('action') ?? '', { method: form.getAttribute('method') ?? 'post', body });
			if (!response.ok || response.redirected || !response.headers.get('Content-Type')?.includes('application/json')) { throw new Error('Could not check notification settings. Reload to retry.'); }
			reflect((await response.json()).enabled === true);
			button.disabled = false;
		} catch (error) {
			const status = document.querySelector('[data-browser-status]');
			if (status) { status.textContent = error instanceof Error ? error.message : 'Could not check notification settings.'; }
			return;
		}
	}).catch(() => {});
	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		button.disabled = true;
		const status = form.parentElement?.querySelector('[data-browser-status]') ?? document.querySelector('[data-browser-status]');
		try {
			const reg = await registration;
			if (!reg) { throw new Error('Notifications are unavailable in this browser.'); }
			// Wait for the actual registration, rather than any other app's worker.
			if (!reg.active) {
				await new Promise((resolve, reject) => {
					const worker = reg.installing ?? reg.waiting;
					if (!worker) { reject(new Error('Service worker is unavailable.')); return; }
					const timeout = setTimeout(() => {return reject(new Error('Service worker activation timed out.'))}, 15000);
					worker.addEventListener('statechange', () => {
						if (worker.state === 'activated') { clearTimeout(timeout); resolve(undefined); }
						if (worker.state === 'redundant') { clearTimeout(timeout); reject(new Error('Service worker activation failed.')); }
					});
				});
			}
			let subscription = await reg.pushManager.getSubscription();
			const disabling = button.getAttribute('aria-pressed') === 'true';
			const body = new FormData(form);
			if (!disabling) {
				const values = await extra();
				for (const [name, value] of Object.entries(values)) { body.set(name, value); }
				const permission = await Notification.requestPermission();
				if (permission !== 'granted') { throw new Error('Allow notifications in your browser to enable alerts.'); }
				subscription ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: publicKey(form.getAttribute('data-key') ?? '') });
			}
			if (!subscription) { reflect(false); return; }
			body.set('endpoint', subscription.endpoint);
			body.set('operation', disabling ? 'unsubscribe' : 'subscribe');
			const {keys} = subscription.toJSON();
			body.set('p256dh', keys?.p256dh ?? '');
			body.set('auth', keys?.auth ?? '');
			const response = await fetch(form.getAttribute('action') ?? '', { method: form.getAttribute('method') ?? 'post', body });
			const destination = form.getAttribute('data-return');
			if (!response.ok || !response.redirected || !destination || new URL(response.url).pathname !== new URL(destination, location.href).pathname) { throw new Error('The notification request failed. Sign in again or retry.'); }
			if (disabling) { await subscription.unsubscribe(); await onUnsubscribe(); }
			reflect(!disabling);
			if (status) { status.textContent = disabling ? 'Notifications disabled.' : 'Notifications enabled.'; }
		} catch (error) {
			if (status) { status.textContent = error instanceof Error ? error.message : 'Notifications are unavailable.'; }
		} finally {
			// This handler disables the button before awaiting and owns its reset.
			// eslint-disable-next-line require-atomic-updates
			button.disabled = false;
		}
	});
}
