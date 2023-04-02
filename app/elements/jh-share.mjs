/**  @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html, state }) {
	const { title, text, url, error } = state.store;
	return html`<style>
			:host {
				width: 100%;
				max-width: 40em;
			}
			label {
				display: block;
				margin-bottom: 1em;
			}
			input,
			textarea {
				background-color: transparent;
				border-color: currentColor;
				border-radius: 0.75em;
				border-style: solid;
				border-width: 0.25em;
				color: inherit;
				display: block;
				outline: 1em currentColor;
				padding: 0.75em;
				width: 100%;
			}
			textarea {
				height: 20vw;
			}
			[type='submit'] {
				padding: 0.75em;
				width: 100%;
			}
		</style>
		<form action="/share">
			${error}
			<label>title<input name="title" type="text" value="${title}" /></label>
			<label>text<textarea name="text" type="text">${text}</textarea></label>
			<label>url<input name="url" type="url" value="${url}" /></label>
			<input type="submit" value="share" />
		</form>`;
}
