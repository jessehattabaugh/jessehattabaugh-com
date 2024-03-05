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

			center {
				padding: var(--unit-half);
			}

			/* don't be vain */
			.photo {
				display: none;
			}

			/* bigger than mobile */
			@media (min-width: 450px) {
				article {
					display: flex;
				}
				jh-nav {
					flex-grow: 1;
				}
			}
		</style>
		<footer>
			<article>
				<jh-nav></jh-nav>
				<jh-contact></jh-contact>
			</article>
			<center>&copy; 1998 - 2024</center>
		</footer>`;
}
