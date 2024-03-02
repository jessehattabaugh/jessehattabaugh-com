/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html }) {
	return html`<style>
			footer {
				backdrop-filter: blur(var(--unit-half));
				background-color: rgba(var(--rgb-background), 0.5);
				border-top: var(--border);
				box-shadow: 0 0 var(--unit) rgba(black, 0.5);
				clear: both;

				padding: 0.5em;
			}
			a {
				display: inline-block;
				padding: 0.5em;
				padding-left: 0;
			}
			img {
				border-radius: 25%;
				height: 6em;
				width: 6em;
				padding: 1em;
				float: left;
			}
			figure {
			}
			ul,
			h6,
			p {
				padding: 0;
			}
			p {
				padding-left: 1em;
			}
			nav {
				padding: 0.5em;
			}
			li {
				list-style: none;
				text-align: center;
			}
			@media (min-width: 25em) {
				.page-container {
					display: flex;
				}
				.page-container > div {
					min-width: 21em;
				}
				jh-nav {
					flex-grow: 1;
				}
				jh-nav li {
					display: inline-block;
					min-width: 25%;
				}
				jh-nav li a {
					width: 100%;
					display: block;
				}
			}
		</style>
		<footer>
			<div class="page-container">
				<jh-nav></jh-nav>
				<div>
					<jh-contact></jh-contact>
					<p>&copy; 1998 - 2024</p>
				</div>
			</div>
		</footer>`;
}
