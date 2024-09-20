/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html }) {
	return html`<style>
			:host {
				display: block;
			}
			/* style dl elements using grid so that dt elements appear to the left of coresponding dd elements */
			dl {
				display: grid;
				grid-template-columns: max-content 1fr;
			}
			dt, dd {
				padding: 0.2em;
				overflow: hidden;
				text-overflow: ellipsis;
			}
			dt::after {
				content: ':';
			}
		</style>
		<div class="vcard p-contact h-card">
			<jh-photo></jh-photo>
			<dl>
				<dt>Location</dt>
				<dd class="adr">
					<span class="locality">Portland</span>, <span class="region">Oregon</span>
					<span class="postal-code">97211</span>
				</dd>

				<dt>Email</dt>
				<dd>
					<a class="email" href="mailto:me@jessehattabaugh.com">me@jessehattabaugh.com</a>
				</dd>

				<dt>Phone</dt>
				<dd><a class="tel" href="tel:+15038939375">(503) 893-9375</a></dd>

				<dt>GitHub</dt>
				<dd>
					<a class="url" href="https://github.com/jessehattabaugh">jessehattabaugh</a>
				</dd>

				<dt>LinkedIn</dt>
				<dd>
					<a class="url" href="https://www.linkedin.com/in/jessehattabaugh/"
						>jessehattabaugh</a
					>
				</dd>
			</dl>
		</div> `;
}
