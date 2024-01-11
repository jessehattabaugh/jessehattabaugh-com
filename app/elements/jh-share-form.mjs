/**  @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html, state }) {
	const { title, text, url, error } = state.store;
	return html`<style>
			:host {
				max-width: 40em;
				width: 100%;
			}
			label {
				display: block;
				margin-bottom: 1em;
			}
			input,
			textarea {
				background-color: transparent;
				border-radius: 0.25em;
				border: solid currentColor;
				box-shadow: 0 0 0.5em currentColor;
				display: block;
				padding: 0.75em;
				width: 100%;
				color: currentColor;
			}
			textarea {
				height: 20vw;
			}
			[type='submit'] {
				border-radius: 1em;
				box-shadow: inset 0 0 0.5em currentColor;
				padding: 0.75em;
				width: 100%;
			}
			.error {
				color: var(--color-error);
			}
			@supports (background: paint(something)) {
				label {
					color: var(--color);
				}
				input,
				textarea {
					border-color: var(--color-one);
					box-shadow: 0 0 0.5em var(--color-one);
					color: var(--color);
				}
				[type='submit'] {
					box-shadow: inset 0 0 0.5em var(--color-one);
				}
			}
		</style>
		<form action="/share" enctype="multipart/form-data" method="post">
			<div class="error">${error}</div>
			<label>title <input name="title" type="text" value="${title}" /></label>
			<label>text <textarea name="text" type="text">${text}</textarea></label>
			<label>url <input name="url" type="url" value="${url}" /></label>
			<label
				>image <input accept="image/*" autocomplete="off" name="image" type="file"
			/></label>
			<input type="submit" value="share" />
		</form>`;
}
