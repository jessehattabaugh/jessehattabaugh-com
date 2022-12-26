/**  @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html, state }) {
	const { title, text, url, error } = state.store;
	return html`<style>
			label,
			input,
			textarea {
				background: #000000;
				color: #ffffff;
				display: block;
			}
			[type='submit'] {
				border-radius: 0.25em;
				border: 1px outset silver;
				font-size: 1.5em;
				padding: 0.5em;
			}
		</style>
		<form action="/share">
			${error}
			<label>title <input name="title" type="text" value="${title}" /></label>
			<label>text <textarea name="text" type="text">${text}</textarea></label>
			<label>url <input name="url" type="url" value="${url}" /></label>
			<input type="submit" value="share" />
		</form>`;
}
