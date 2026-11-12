import '../index.js';

// The reference page's controls write public attributes and read public events.
for (const control of document.querySelectorAll('[data-game-for]')) {
	if (!(control instanceof HTMLInputElement)) { continue; }
	const target = document.getElementById(control.dataset.gameFor ?? '');
	if (!target) { continue; }
	const update = () => { target.setAttribute(control.name, control.value); };
	control.addEventListener('input', update);
	update();
	control.closest('label')?.removeAttribute('hidden');
}

for (const status of document.querySelectorAll('[data-game-event]')) {
	if (!(status instanceof HTMLElement) || !status.dataset.gameEvent) { continue; }
	status.closest('section')?.addEventListener(status.dataset.gameEvent, (event) => {
		if (!(event instanceof CustomEvent)) { return; }
		status.textContent = `${event.type} ${JSON.stringify(event.detail)}`;
		status.hidden = false;
	});
}
