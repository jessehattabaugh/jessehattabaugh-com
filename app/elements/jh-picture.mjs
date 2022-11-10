/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html }) {
	return html`<style>
			img {
				border-radius: 50%;
				box-shadow: black 0.5em 0.5em 1em 0em, red 0 -0.2em 0em 0.5em;
				float: left;
				margin: 1em;
				max-width: 38.2%;
				shape-outside: circle(50%);
				width: 100%;
			}
		</style>
		<picture>
			<source media="(min-width: 512px)" srcset="/_public/jesse975.webp" type="image/webp" />
			<source media="(max-width: 192px)" srcset="/_public/jesse192.png" type="image/png" />
			<img
				alt="Photo of Jesse Hattabaugh"
				class="round"
				src="/_public/jesse512.png"
				width="512"
			/>
		</picture>`;
}
