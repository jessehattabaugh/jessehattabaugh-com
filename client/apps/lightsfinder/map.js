/** Pointer gestures enhance the server's map and GET form. No map SDK or API
 * endpoint is needed: tiles and search affordances come from the rendered HTML. */
export {};
const namespace = 'http://www.w3.org/2000/svg';
/** @type {(() => void) | undefined} */
let dispose;
function initialize() {
	dispose?.();
	if (!('PointerEvent' in window) || !('fetch' in window) || !('FormData' in window) || !('startViewTransition' in document)) { return; }
	const region = document.querySelector('[data-lightsfinder] [data-map]');
	const foundsvg = region?.querySelector('svg'), foundform = region?.querySelector('[data-map-form]');
	const foundtiles = foundsvg?.querySelector('[data-map-tiles]'), foundfeatures = foundsvg?.querySelector('[data-map-features]');
	const source = foundtiles?.querySelector('image')?.getAttribute('href');
	if (!(region instanceof HTMLElement) || !(foundsvg instanceof SVGSVGElement) || !(foundform instanceof HTMLFormElement) || !foundtiles || !foundfeatures || !source) { return; }
	const svg = foundsvg, form = foundform, tiles = foundtiles, features = foundfeatures;
	const tileURL = new URL(source);
	const values = new FormData(form);
	const initialZoom = Number(values.get('zoom'));
	let zoom = initialZoom;
	const world = 256 * 2 ** zoom;
	const sine = Math.sin(Number(values.get('lat')) * Math.PI / 180);
	const initial = { x: (Number(values.get('lon')) + 180) / 360 * world, y: (.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * world };
	let { x, y } = initial;
	let width = 768, height = 512, timer = 0, moved = false;
	let request = new AbortController();
	const lifetime = new AbortController(), options = { signal: lifetime.signal };
	/** @type {Map<number, {x: number, y: number}>} */
	const pointers = new Map();
	/** @type {Map<string, SVGImageElement>} */
	const images = new Map();
	tiles.replaceChildren();
	svg.dataset.slippy = 'true';
	function draw() {
		const size = 256 * 2 ** zoom;
		x = ((x % size) + size) % size;
		y = Math.max(.00164 * size, Math.min(.99836 * size, y));
		const left = x - width / 2, top = y - height / 2;
		const tileZoom = Math.round(zoom), scale = 2 ** (zoom - tileZoom), edge = 256 * scale, count = 2 ** tileZoom;
		const visible = new Set();
		for (let row = Math.floor(top / edge); row <= Math.floor((top + height) / edge); row++) {
			if (row < 0 || row >= count) { continue; }
			for (let column = Math.floor(left / edge); column <= Math.floor((left + width) / edge); column++) {
				const key = `${tileZoom}/${column}/${row}`; visible.add(key);
				let tile = images.get(key);
				if (!tile) {
					tile = document.createElementNS(namespace, 'image');
					const url = new URL(tileURL);
					url.pathname = url.pathname.replace(/\d+\/\d+\/\d+\.png$/, `${tileZoom}/${((column % count) + count) % count}/${row}.png`);
					tile.setAttribute('href', url.href); images.set(key, tile); tiles.append(tile);
				}
				tile.setAttribute('x', String(column * edge - left)); tile.setAttribute('y', String(row * edge - top));
				tile.setAttribute('width', String(edge + .5)); tile.setAttribute('height', String(edge + .5));
			}
		}
		for (const [key, tile] of images) { if (!visible.has(key)) { tile.remove(); images.delete(key); } }
		const scaleFromInitial = 2 ** (zoom - initialZoom);
		// Wrap overlays alongside the nearest copy of the world at the date line.
		const offset = Math.round((x - initial.x * scaleFromInitial) / size) * size;
		features.setAttribute('transform', `translate(${width / 2 - x + (initial.x - 384) * scaleFromInitial + offset} ${height / 2 - y + (initial.y - 256) * scaleFromInitial}) scale(${scaleFromInitial})`);
	}
	function resize() {
		const bounds = svg.getBoundingClientRect(); ({ width, height } = bounds);
		svg.setAttribute('viewBox', `0 0 ${width} ${height}`); draw();
	}
	function cancelPending() { clearTimeout(timer); request.abort(); request = new AbortController(); }
	async function refresh() {
		if (!form.isConnected) { return; }
		const size = 256 * 2 ** zoom;
		const next = { lat: Math.atan(Math.sinh(Math.PI * (1 - 2 * y / size))) * 180 / Math.PI, lon: x / size * 360 - 180, zoom: Math.round(zoom) };
		for (const [name, value] of Object.entries(next)) {
			const input = form.elements.namedItem(name); if (input instanceof HTMLInputElement) { input.value = String(value); }
		}
		const url = new URL(form.getAttribute('action') ?? '', location.href);
		for (const [name, value] of new FormData(form)) { url.searchParams.set(name, String(value)); }
		const {signal} = request;
		try {
			region?.setAttribute('aria-busy', 'true');
			const response = await fetch(url, { method: form.method, headers: { 'X-Fragment': 'true' }, signal });
			if (!response.ok || response.redirected) { throw new Error('Map search unavailable'); }
			const markup = await response.text();
			if (/<!doctype|<html[\s>]/i.test(markup)) { throw new Error('Expected fragment'); }
			const target = document.querySelector(form.getAttribute('data-target') ?? '');
			if (!target) { throw new Error('Missing map target'); }
			const focused = document.activeElement === svg;
			await document.startViewTransition(() => {
				if (signal.aborted || !form.isConnected) { return; }
				target.innerHTML = markup; history.pushState(null, '', url);
				document.dispatchEvent(new Event('fragment-loaded'));
				if (focused) { document.querySelector('[data-map] > svg')?.setAttribute('tabindex', '0'); const nextMap = document.querySelector('[data-map] > svg'); if (nextMap instanceof SVGSVGElement) { nextMap.focus({ preventScroll: true }); } }
			}).finished;
		} catch {
			if (!signal.aborted && form.isConnected) { HTMLFormElement.prototype.submit.call(form); }
		}
	}
	function settle() {
		clearTimeout(timer);
		timer = window.setTimeout(() => { void refresh(); }, 350);
	}
	/** @param {number} next @param {number} [anchorX] @param {number} [anchorY] */
	function magnify(next, anchorX = width / 2, anchorY = height / 2) {
		const bounded = Math.max(3, Math.min(16, next)), scale = 2 ** (bounded - zoom);
		x = (x + anchorX - width / 2) * scale - anchorX + width / 2;
		y = (y + anchorY - height / 2) * scale - anchorY + height / 2;
		zoom = bounded; draw();
	}
	/** @param {PointerEvent} event */
	function down(event) {
		if (event.button !== 0) { return; }
		cancelPending(); if (!pointers.size) { moved = false; }
		pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
	}
	svg.addEventListener('pointerdown', down, options);
	svg.addEventListener('pointermove', (event) => {
		const previous = pointers.get(event.pointerId); if (!previous) { return; }
		const dx = event.clientX - previous.x, dy = event.clientY - previous.y;
		if (!moved && Math.hypot(dx, dy) < 4) { return; }
		moved = true; svg.setPointerCapture(event.pointerId); svg.dataset.dragging = 'true';
		const other = [...pointers.entries()].find(([id]) => { return id !== event.pointerId; })?.[1];
		if (other) {
			const before = Math.hypot(previous.x - other.x, previous.y - other.y), after = Math.hypot(event.clientX - other.x, event.clientY - other.y);
			const bounds = svg.getBoundingClientRect();
			if (before > 0 && after > 0) { magnify(zoom + Math.log2(after / before), (previous.x + other.x) / 2 - bounds.left, (previous.y + other.y) / 2 - bounds.top); }
		}
		x -= dx / (other ? 2 : 1); y -= dy / (other ? 2 : 1);
		pointers.set(event.pointerId, { x: event.clientX, y: event.clientY }); draw();
	}, options);
	/** @param {PointerEvent} event */
	function up(event) {
		if (!pointers.delete(event.pointerId)) { return; }
		if (svg.hasPointerCapture(event.pointerId)) { svg.releasePointerCapture(event.pointerId); }
		if (!pointers.size) { delete svg.dataset.dragging; if (moved) { magnify(Math.round(zoom)); settle(); } }
	}
	window.addEventListener('pointerup', up, options);
	window.addEventListener('pointercancel', up, options);
	svg.addEventListener('click', (event) => { if (moved) { event.preventDefault(); event.stopPropagation(); } }, { ...options, capture: true });
	svg.addEventListener('wheel', (event) => {
		event.preventDefault(); cancelPending();
		const bounds = svg.getBoundingClientRect(); magnify(zoom - Math.sign(event.deltaY), event.clientX - bounds.left, event.clientY - bounds.top); settle();
	}, { ...options, passive: false });
	svg.addEventListener('dblclick', (event) => {
		if (event.target instanceof Element && event.target.closest('a')) { return; }
		event.preventDefault(); cancelPending(); const bounds = svg.getBoundingClientRect(); magnify(zoom + 1, event.clientX - bounds.left, event.clientY - bounds.top); settle();
	}, options);
	svg.addEventListener('keydown', (event) => {
		if (event.target !== svg || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-'].includes(event.key)) { return; }
		event.preventDefault(); cancelPending();
		if (['+', '=', '-'].includes(event.key)) { magnify(zoom + (event.key === '-' ? -1 : 1)); }
		else {
			if (event.key === 'ArrowRight') { x += width / 2; }
			if (event.key === 'ArrowLeft') { x -= width / 2; }
			if (event.key === 'ArrowDown') { y += height / 2; }
			if (event.key === 'ArrowUp') { y -= height / 2; }
			draw();
		}
		settle();
	}, options);
	const observer = new ResizeObserver(resize); observer.observe(svg); resize();
	dispose = () => { lifetime.abort(); request.abort(); clearTimeout(timer); observer.disconnect(); };
}
initialize(); document.addEventListener('fragment-loaded', initialize);
