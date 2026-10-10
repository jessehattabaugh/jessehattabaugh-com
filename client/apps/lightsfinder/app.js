/** Browser capabilities enhance the existing manual forms, never replace them. */
export {};
if ('serviceWorker' in navigator) {
	navigator.serviceWorker.register(new URL('./sw.js', import.meta.url), { type: 'module' }).catch(() => { /* Online use stays available. */ });
}
function reveal() {
	for (const button of document.querySelectorAll('[data-lightsfinder] [data-locate]')) {
		if (button instanceof HTMLButtonElement) { button.hidden = !('geolocation' in navigator); }
	}
	for (const button of document.querySelectorAll('[data-lightsfinder] [data-share]')) {
		if (button instanceof HTMLButtonElement) { button.hidden = !('share' in navigator || 'clipboard' in navigator); }
	}
}
reveal(); document.addEventListener('fragment-loaded', reveal);
document.addEventListener('click', async (event) => {
	if (!(event.target instanceof Element)) { return; }
	const locate = event.target.closest('[data-locate]');
	if (locate instanceof HTMLButtonElement && locate.closest('[data-lightsfinder]')) {
		const form = locate.closest('form'), status = form?.querySelector('[data-location-status]');
		if (!form) { return; }
		if (status) { status.textContent = 'Finding your location…'; }
		locate.disabled = true;
		navigator.geolocation.getCurrentPosition((position) => {
			for (const [name, value] of [['lat', position.coords.latitude], ['lon', position.coords.longitude]]) {
				const input = form.elements.namedItem(String(name));
				if (input instanceof HTMLInputElement) { input.value = Number(value).toFixed(6); }
			}
			if (status) { status.textContent = 'Location filled. Check it before sharing or searching.'; }
			locate.disabled = false;
		}, () => {
			if (status) { status.textContent = 'Location unavailable. Enter coordinates manually.'; }
			locate.disabled = false;
		}, { timeout: 10000, maximumAge: 60000, enableHighAccuracy: true });
	}
	const share = event.target.closest('[data-share]');
	if (share instanceof HTMLButtonElement) {
		const status = share.parentElement?.querySelector('[data-share-status]');
		try {
			if (navigator.share) { await navigator.share({ title: document.title, url: location.href }); }
			else { await navigator.clipboard.writeText(location.href); if (status) { status.textContent = 'Sighting link copied.'; } }
		} catch { if (status) { status.textContent = 'Use the page address to share this sighting.'; } }
	}
});

/** Re-encoding rotates camera photos correctly, removes metadata, and bounds size.
 * If canvas/File APIs are unavailable, the native upload and server limit remain. */
document.addEventListener('change', async (event) => {
	const input = event.target;
	if (!(input instanceof HTMLInputElement) || input.type !== 'file' || !input.closest('[data-lightsfinder]') || !input.files?.[0] || !('createImageBitmap' in window) || !('DataTransfer' in window)) { return; }
	const [original] = input.files;
	const status = input.form?.querySelector('[data-upload-status]');
	const submit = input.form?.querySelector('button:not([type="button"])');
	if (submit instanceof HTMLButtonElement) { submit.disabled = true; }
	try {
		const image = await createImageBitmap(original, { imageOrientation: 'from-image' });
		let edge = 1400, blob;
		for (let attempt = 0; attempt < 4; attempt++) {
			const canvas = document.createElement('canvas'), scale = Math.min(1, edge / Math.max(image.width, image.height));
			canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
			const context = canvas.getContext('2d'); if (!context) { throw new Error('Canvas unavailable'); }
			context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
			// Re-encode at a smaller size only if the previous blob exceeds the limit.
			// eslint-disable-next-line no-await-in-loop
			blob = await new Promise((resolve) => { canvas.toBlob(resolve, 'image/jpeg', .82); });
			if (blob && blob.size <= 750000) { break; } edge *= .7;
		}
		image.close();
		if (!blob || blob.size > 750000) { throw new Error('Photo too large'); }
		const transfer = new DataTransfer(); transfer.items.add(new File([blob], 'lights.jpg', { type: 'image/jpeg' })); input.files = transfer.files;
		if (status) { status.textContent = `Photo ready · ${Math.ceil(blob.size / 1000)} KB. Location metadata removed.`; }
	} catch { if (status) { status.textContent = 'Automatic resizing unavailable. Choose a JPEG, PNG, or WebP up to 750 KB.'; } }
	finally { if (submit instanceof HTMLButtonElement) { submit.disabled = false; } }
});
