/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html }) {
	return html`<style>
			footer {
				clear: both;
				text-align: right;
				padding: 1em;
			}
			a {
				display: inline-block;
				font-size: smaller;
			}
			img {
				border-radius: 25%;
				float: right;
				height: 4em;
				margin: 0.5em;
				width: 4em;
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
			<div>
				<a href="mailto:webmaster@jessehattabaugh.com" class="email"
					>webmaster@jessehattabaugh.com</a
				>
			</div>
			<div>
				<a href="tel:+15038939375" class="tel">(503) 893-9375</a>
			</div>
			<div>&copy; 2023</div>
			<bgsound loop="infinite" src="/_public/audio/JessiesGirl.mid"></bgsound>
			<audio controls loop src="/_public/audio/JessiesGirl.mp3"></audio>
		</footer>`;
}
