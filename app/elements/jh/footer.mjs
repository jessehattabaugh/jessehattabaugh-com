/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html }) {
	return html`<style>
			footer {
				backdrop-filter: blur(var(--unit-half));
				background-color: rgba(var(--rgb-background), 0.5);
				border-top: var(--border);
				box-shadow: 0 0 var(--unit) rgba(black, 0.5);
				clear: both;
				padding: var(--unit-half);
			}
			jh-nav nav {
				padding: var(--unit-half);
			}
			jh-nav li {
				list-style: none;
				text-align: center;
			}
			.photo {
				max-width: 6em;
			}
			@media (min-width: 20em) {
				.page-container {
					display: flex;
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
				<jh-contact></jh-contact>

			</div>
			<center>&copy; 1998 - 2024</center>
		</footer>`;
}
