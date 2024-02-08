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
		example.textContent = demonstration.innerHTML;
	}
}

customElements.define('demo-doc', DemoDoc);
