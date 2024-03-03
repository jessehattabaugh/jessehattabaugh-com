/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html }) {
	return html`<style>
		dl {
		}
		dt::after {
			content: ':';
		}
		dt, dd {
			display: inline-block;
		}
		dt{
			outline: 1px dashed red;
		}
		dd {
			outline: 1px dashed lime;
		}
	</style>
	<div class="vcard">
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
