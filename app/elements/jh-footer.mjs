/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html }) {
	return html`<style>
			footer {
				clear: both;
				text-align: right;
			}
			a {
				display: block;
				margin-bottom: 1em;
				font-size: 0.9em;
			}
			img {
				float: right;
				height: 4.25em;
				margin: 0.5em;
				width: 4.25em;
			}
		</style>
		<footer id="contact" class="vcard">
			<img
				alt="Jesse Hattabaugh"
				class="photo"
				height="192"
				src="/_public/jesse192.png"
				width="192"
			/>
			<h3 class="fn">Jesse Hattabaugh</h3>
			<a href="mailto:webmaster@jessehattabaugh.com" class="email"
				>webmaster@jessehattabaugh.com</a
			>
			<a href="tel:+15038939375" class="tel">(503) 893-9375</a>
			<center>&copy; 2023 <jh-auth></jh-auth></center>
		</footer>`;
}
