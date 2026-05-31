import { html } from '../html.js';
import { layout } from './layout.js';

/**
 * @param {object} [opts]
 * @param {string} [opts.error]
 * @param {{ name: string, email: string, message: string }} [opts.values]
 * @returns {import('../html.js').Raw}
 */
export const contact = ({ error, values } = {}) => {
	return layout({
		title: 'Contact',
		path: '/contact',
		description: 'Get in touch with Jesse Hattabaugh.',
		body: html`
			<article>
				<h1>Contact</h1>
				<p>Send me a message and I'll get back to you.</p>
				${error ? html`<p class="error" role="alert">${error}</p>` : html``}
				<form method="post" action="/contact">
					<div class="field">
						<label for="name">Name</label>
						<input
							id="name"
							name="name"
							type="text"
							autocomplete="name"
							required
							value="${values?.name ?? ''}"
						/>
					</div>
					<div class="field">
						<label for="email">Email</label>
						<input
							id="email"
							name="email"
							type="email"
							autocomplete="email"
							required
							value="${values?.email ?? ''}"
						/>
					</div>
					<div class="field">
						<label for="message">Message</label>
						<textarea id="message" name="message" rows="6" required>
${values?.message ?? ''}</textarea
						>
					</div>
					<button type="submit">Send message</button>
				</form>
			</article>
		`,
	});
};

/**
 * Fragment: just the form, for fragment-swap responses.
 * @param {Parameters<typeof contact>[0]} [opts]
 * @returns {import('../html.js').Raw}
 */
export const contactFragment = (opts) => {
	return html` ${contact(opts).value} `;
};
