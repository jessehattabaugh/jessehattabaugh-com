class DemoDoc extends HTMLElement {
	constructor() {
		super();
	}
	connectedCallback() {
		const id = this.getAttribute('id');
		const exampleId = `${id}-example`;
		const demonstrationSelector = `#${id}-demonstration [slot=code]`;
		const example = document.getElementById(exampleId);
		const demonstration = document.querySelector(demonstrationSelector);
		const lines = demonstration.innerHTML.split('\n');
		const normalizedHtml = lines
			.map((line) => {
				// remove the first two tabs
				return line.replace(/^\t{2}/, '');
			})
			.join('\n')
			.trim();
		example.textContent = normalizedHtml;
	}
}

customElements.define('demo-doc', DemoDoc);
