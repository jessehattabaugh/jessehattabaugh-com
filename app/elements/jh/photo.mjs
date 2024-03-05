/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html }) {
	return html`<style>
			:host {
				--box-shadow-photo: black 0.25em 0.25em 1em 0em;
				--box-shadow-highlight: 0 0 0 0.3em;
			}
			figure {
				padding: var(--unit-half) 0;
			}
			figcaption {
				font-size: larger;
			}
			img {
				border-radius: 50%;
				box-shadow: var(--box-shadow-photo), currentColor var(--box-shadow-highlight);
				height: 100%;
				width: 100%;
			}
			@media (min-width: 469px) {
				figure {
					float: left;
					margin-bottom: var(--unit);
					margin-right: var(--unit);
					max-width: 33%;
					shape-outside: circle(50%);
				}
			}
			@supports (background: paint(something)) {
				img {
					box-shadow: var(--box-shadow-photo),
						var(--color-current) var(--box-shadow-highlight);
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
				<a class="fn url no-wrap" href="https://jessehattabaugh.com">Jesse Hattabaugh</a>
			</figcaption>
		</figure> `;
}
