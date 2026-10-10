/** Optional navigation acceleration. The markup owns URLs, methods and targets. */
import './install.js';
if ('startViewTransition' in document && 'fetch' in window && 'FormData' in window) {
	/** @param {HTMLFormElement | HTMLAnchorElement} control @param {FormData} [body] */
	async function follow(control, body) {
		const selector = control.getAttribute('data-target');
		if (!selector) { throw new Error('Missing fragment target'); }
		const target = document.querySelector(selector);
		if (!target) { throw new Error('Fragment target missing'); }
		const form = control instanceof HTMLFormElement;
		const url = new URL(form ? control.getAttribute('action') ?? '' : control.getAttribute('href') ?? '', location.href);
		const method = form ? (control.getAttribute('method') ?? 'get').toUpperCase() : 'GET';
		if (method === 'GET' && body) {
			for (const [name, value] of body) { url.searchParams.set(name, String(value)); }
		}
		const response = await fetch(url, {
			method, body: method === 'GET' ? undefined : body,
			headers: { 'X-Fragment': 'true', Accept: 'text/html' },
		});
		if (response.redirected) { location.assign(response.url); return; }
		if (!response.headers.get('Content-Type')?.includes('text/html')) { throw new Error('Expected HTML'); }
		const markup = await response.text();
		// Unformatted infrastructure errors use native navigation. Server-rendered
		// fragments (including validation/conflict/unavailable responses) stay visible.
		if (/<!doctype|<html[\s>]/i.test(markup)) { throw new Error('Expected a fragment'); }
		await document.startViewTransition(() => {
			target.innerHTML = markup;
		}).finished;
		if (method === 'GET') { history.pushState(null, '', url); }
		document.dispatchEvent(new Event('fragment-loaded'));
		const heading = target.querySelector('h1');
		if (heading instanceof HTMLElement) {
			heading.tabIndex = -1;
			heading.focus();
		}
	}

	document.addEventListener('submit', async (event) => {
		const form = event.target;
		if (!(form instanceof HTMLFormElement) || !form.hasAttribute('data-target') || form.hasAttribute('data-no-enhance')) { return; }
		event.preventDefault();
		try {
			await follow(form, new FormData(form, event.submitter));
		} catch {
			// submit() has no submitter. Retain its named action without re-entering
			// this enhancement's submit handler through requestSubmit().
			const {submitter} = event;
			if (submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement) {
				if (submitter.name) {
					const action = document.createElement('input');
					action.type = 'hidden';
					action.name = submitter.name;
					action.value = submitter.value;
					form.append(action);
				}
			}
			HTMLFormElement.prototype.submit.call(form);
		}
	});

	document.addEventListener('click', async (event) => {
		if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) { return; }
		const link = event.target instanceof Element ? event.target.closest('a[data-target]') : null;
		if (!(link instanceof HTMLAnchorElement) || link.target || link.hasAttribute('download')) { return; }
		event.preventDefault();
		try { await follow(link); } catch { location.assign(link.href); }
	});

	// Reload from the server on back/forward so URL and representation stay in sync.
	window.addEventListener('popstate', () => {return location.reload()});
}
