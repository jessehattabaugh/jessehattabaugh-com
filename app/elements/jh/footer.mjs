/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html }) {
	return html`<style>
			footer {
				background-color: rgba(var(--rgb-background), 0.5);
				border-top: var(--border);
				box-shadow: 0 0 var(--unit) rgba(black, 0.5);
				clear: both;
				padding: var(--unit);
			}

			small {
				display: block;
				font-size: smaller;
				padding: var(--unit-half);
				text-align: center;
			}

			/* don't be vain */
			.photo {
				display: none;
			}

			jh-contact  {
				min-width: 17em;
			}

			jh-contact figure {
				float: none;
				margin: 0;
				padding: 0;
			}

			/* bigger than mobile */
			@media (min-width: 469px) {
				article {
					align-items: center;
					display: flex;
				}
				jh-nav {
					flex: 1;
				}
			}
		</style>
		<footer>
			<article>
				<jh-nav></jh-nav>
				<jh-contact></jh-contact>
			</article>
			<small>&copy; 1998 - 2024</small>
		</footer>`;
}
