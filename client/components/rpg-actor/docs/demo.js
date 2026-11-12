import '../index.js';
document.addEventListener('submit', (event) => {
	const form = event.target;
	const actor = document.querySelector('[aria-label="Sprite playground"] rpg-actor');
	if (!(form instanceof HTMLFormElement) || form.getAttribute('aria-label') !== 'Sprite controls' || !actor) { return; }
	event.preventDefault();
	try {
		const data = new FormData(form);
		actor.removeAttribute('showcase');
		for (const name of ['animation', 'direction', 'expression']) { actor.setAttribute(name, String(data.get(name))); }
		for (const name of ['talking', 'paused']) { actor.toggleAttribute(name, data.has(name)); }
	} catch { HTMLFormElement.prototype.submit.call(form); }
});
document.addEventListener('actor-change', (event) => {
	const status = document.querySelector('[aria-label="Sprite state"]');
	if (status && event instanceof CustomEvent && event.target instanceof Element && event.target.closest('[aria-label="Sprite playground"]')) {
		const { animation, direction, expression, talking, paused } = event.detail;
		status.textContent = `${animation} · ${direction} · ${expression}${talking ? ' · talking' : ''}${paused ? ' · paused' : ''}`;
	}
});
