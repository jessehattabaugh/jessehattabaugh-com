/**
 * @type {import('@enhance/types').EnhanceElemFn}
 */
export default function ({ html }) {
	return html` <style>
			:host {
				flex: none;
			}
		</style>
		<footer id="contact">
			<h2>Contact Me</h2>
			<dl>
				<dt>Email</dt>
				<dd>
					<address>
						<a
							style="word-wrap: break-word"
							href="mailto:some@email.com"
							>some@email.com</a
						>
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
