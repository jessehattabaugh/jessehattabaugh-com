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
			ul,
			h6,
			p,
			dl,
			dt,
			dd {
				padding: 0;
			}
			p {
				padding-left: 1em;
			}
			jh-nav nav {
				padding: 0.5em;
			}
			jh-nav li {
				list-style: none;
				text-align: center;
			}
			jh-contact img {
				max-width: 6em;
				max-height: 6em;
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
