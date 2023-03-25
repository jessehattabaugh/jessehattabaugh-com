/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html }) {
	return html`<style>
			a {
				display: block;
			}
			footer {
				clear: both;
				height: 100%;
			}
			.photo {
				width: 4em;
				float: left;
				margin: 0.5em;
			}
		</style>
		<footer id="contact" class="vcard">
			<img alt="Jesse Hattabaugh" class="photo" src="/_public/jesse192.png" width="192" />
			<h3 class="fn">Jesse Hattabaugh</h3>
			<a href="mailto:webmaster@jessehattabaugh.com" class="email"
				>webmaster@jessehattabaugh.com</a
			>
			<a href="tel:+15038939375" class="tel">(503) 893-9375</a>
			<div>&copy; 2023</div>
		</footer>`;
}
