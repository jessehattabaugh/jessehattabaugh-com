import './rpg-actor/index.js';
const form = document.querySelector('form[aria-label="Sprite controls"]');
const actor = document.querySelector('rpg-actor');
const status = document.querySelector('[aria-label="Sprite state"]');
if (form instanceof HTMLFormElement && actor) {
	form.addEventListener('submit', (event) => {
		event.preventDefault();
		try {
			const data = new FormData(form);
			actor.removeAttribute('showcase');
			for (const name of ['animation', 'direction', 'expression']) { actor.setAttribute(name, String(data.get(name))); }
			for (const name of ['talking', 'paused']) { actor.toggleAttribute(name, data.has(name)); }
		} catch { HTMLFormElement.prototype.submit.call(form); }
	});
	actor.addEventListener('actor-change', (event) => {
		if (status && event instanceof CustomEvent) {
			const { animation, direction, expression, talking, paused } = event.detail;
			status.textContent = `${animation} · ${direction} · ${expression}${talking ? ' · talking' : ''}${paused ? ' · paused' : ''}`;
		}
	});
}
