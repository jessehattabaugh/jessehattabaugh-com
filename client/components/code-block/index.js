import { CodeBlock } from './code-block.js';

// The first definition wins when two copies of the module land on one page.
if (!customElements.get('code-block')) {
	customElements.define('code-block', CodeBlock);
}

export { CodeBlock };
