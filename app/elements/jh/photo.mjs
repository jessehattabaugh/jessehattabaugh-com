/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html }) {
	return html`<style>
			:host {
				--box-shadow-photo: black 0.25em 0.25em 1em 0em;
				--box-shadow-highlight: 0 0 0 0.3em;
			}
			img {
				border-radius: 50%;
				box-shadow: var(--box-shadow-photo), currentColor var(--box-shadow-highlight);
				height: 100%;
				max-width: 50%;
				shape-outside: circle(50%);
				width: 100%;
			}
			figure {
				text-align: center;
			}
			@supports (background: paint(something)) {
				img {
					box-shadow: var(--box-shadow-photo), var(--color-current) var(--box-shadow-highlight);
				}
			}
		</style>
		<figure>
			<picture>
				<source
					media="(min-width: 512px)"
					srcset="/_public/images/jesse975.avif"
					type="image/avif"
				/>
				<source
					media="(min-width: 512px)"
					srcset="/_public/images/jesse975.webp"
					type="image/webp"
				/>
				<source
					media="(min-width: 512px)"
					srcset="/_public/images/jesse975.jxl"
					type="image/jxl"
				/>
				<source
					media="(max-width: 192px)"
					srcset="/_public/images/jesse192.png"
					type="image/png"
				/>
				<img
					alt="Photo of Jesse Hattabaugh"
					class="photo"
					height="512"
					src="/_public/images/jesse512.png"
					width="512"
				/>
			</picture>
			<figcaption>
				<h4><a class="fn url no-wrap" href="https://jessehattabaugh.com">Jesse Hattabaugh</a></h4>
			</figcaption>
		</figure> `;
}
