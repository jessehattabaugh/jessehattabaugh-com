/**
 * @type {import('@enhance/types').EnhanceElemFn}
 */
export default function ({ html }) {
	return html`<picture>
		<source
			media="(min-width: 512px)"
			srcset="/_public/jesse975.webp"
			type="image/webp"
		/>
		<source
			media="(max-width: 192px)"
			srcset="/_public/jesse192.png"
			type="image/png"
		/>
		<img
			alt="Photo of Jesse Hattabaugh"
			class="round"
			src="/_public/jesse512.png"
			width="512"
		/>
	</picture>`;
}
