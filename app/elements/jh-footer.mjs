/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html }) {
	return html`<style>
			dt {
				float: left;
				margin-right: 1.5em;
				text-align: right;
				width: 10%;
			}
			dt::after {
				content: ':';
			}
			dd {
				margin-inline-start: 0;
			}
			footer {
				clear: both;
				height: 100%;
			}
		</style>
		<footer id="contact">
			<h3>Contact Me</h3>
			<dl>
				<dt>Email</dt>
				<dd>
					<address>
						<a href="mailto:some@email.com">some@email.com</a>
					</address>
				</dd>
				<dt>SMS</dt>
				<dd><a href="sms:+12223334444">(222) 333-4444</a></dd>
			</dl>
			<span
				>&copy; 2022
				<address>
					<a href="mailto:some@email.com">Jesse Hattabaugh</a>
				</address></span
			>
		</footer>`;
}
