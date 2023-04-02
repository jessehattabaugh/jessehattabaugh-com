/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html }) {
	return html`<style>
			img {
				border-radius: 50%;
				box-shadow: black 0.5em 0.5em 1em 0em, currentColor 0 -0.2em 0em 0.5em;
				float: left;
				height: 30vw;
				margin-right: 5%;
				margin-bottom: 5%;
				max-width: 512px;
				shape-outside: circle(50%);
				width: 30vw;
			}
		</style>
		<picture>
			<source media="(min-width: 512px)" srcset="/_public/jesse975.webp" type="image/webp" />
			<source media="(max-width: 192px)" srcset="/_public/jesse192.png" type="image/png" />
			<img
				alt="Photo of Jesse Hattabaugh"
				height="512"
				src="/_public/jesse512.png"
				width="512"
			/>
		</picture>`;
}
