/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html }) {
	return html`<style>
		/* style dl elements using grid so that dt elements appear to the left of coresponding dd elements */
		dl {
			display: grid;
			grid-template-columns: max-content 1fr;
		}
		dt::after {
			content: ':';
		}
		/* when the element's container is bigger than the dl requires, put the jh-picture and it's caption to the left of the contact info */
		@media (min-width: 25em) {
			.vcard {
				display: grid;
				grid-template-columns: 1fr 1fr;
			}
		}
	</style>
	<div class="vcard p-contact h-card">
		<jh-picture></jh-picture>
		<dl>
			<dt>Location</dt>
			<dd class="adr">
				<span class="locality">Portland</span>, <span class="region">Oregon</span>
				<span class="postal-code">97211</span>
			</dd>

			<dt>Email</dt>
			<dd><a class="email" href="mailto:me@jessehattabaugh.com">me@jessehattabaugh.com</a></dd>

			<dt>Phone</dt>
			<dd><a class="tel" href="tel:+15038939375">(503) 893-9375</a></dd>

			<dt>GitHub</dt>
			<dd><a class="url" href="https://github.com/jessehattabaugh">jessehattabaugh</a></dd>

			<dt>LinkedIn</dt>
			<dd><a class="url" href="https://www.linkedin.com/in/jessehattabaugh/">jessehattabaugh</a></dd>
		</dl>
	</div>
	`;
}
