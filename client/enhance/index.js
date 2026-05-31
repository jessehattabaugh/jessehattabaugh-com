/**
 * Progressive enhancement entry point.
 * All enhancements are feature-detected; the page works without this script.
 */

// Fetch-and-swap for form submissions (HATEOAS-aware fragment swaps).
// Reads action/method FROM the markup, never hardcodes endpoint knowledge.
if ('startViewTransition' in document) {
	document.addEventListener('submit', async (event) => {
		const form = /** @type {HTMLFormElement | null} */ (event.target);
		if (!form || form.dataset.noEnhance) return;

		const method = (form.method || 'get').toUpperCase();
		const action = form.action;

		event.preventDefault();

		try {
			const body = method === 'GET' ? undefined : new FormData(form);
			const url =
				method === 'GET'
					? `${action}?${new URLSearchParams(/** @type {any} */ (new FormData(form))).toString()}`
					: action;

			const res = await fetch(url, {
				method,
				body,
				headers: { 'X-Fragment': 'true', Accept: 'text/fragment+html' },
				redirect: 'follow',
			});

			if (res.redirected) {
				// Server issued a PRG redirect; navigate there
				document.startViewTransition(() => {
					window.location.assign(res.url);
				});
				return;
			}

			if (!res.ok) {
				const html = await res.text();
				document.startViewTransition(() => {
					// Replace main content with the error response
					const main = document.querySelector('main');
					if (main) main.innerHTML = extractMain(html) ?? html;
				});
				return;
			}

			// Success: navigate to the redirect target or refresh
			document.startViewTransition(() => {
				window.location.reload();
			});
		} catch {
			// Enhancement failed — let the browser handle it natively
			form.submit();
		}
	});
}

/**
 * Extract the inner HTML of <main> from a full-page HTML string.
 * @param {string} html
 * @returns {string | null}
 */
function extractMain(html) {
	const match = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
	return match ? match[1] : null;
}
