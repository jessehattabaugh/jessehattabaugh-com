/**  @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html, state }) {
	const { title, text, url } = state.store;
	return html`<style>
			label,
			input,
			textarea {
				background: #000000;
				color: #ffffff;
				display: block;
			}
			[type='submit'] {
				font-size: 1.5em;
				padding: 0.5em;
				border-radius: 0.25em;
			}
		</style>
		<form method="post" enctype="multipart/form-data" action="/share">
			<label>title <input name="title" type="text" value="${title}" /></label>
			<label>text <textarea name="text" type="text">${text}</textarea></label>
			<label>url <input name="url" type="url" value="${url}" /></label>
			<label>photo <input name="photo" type="file" accept="image/jpg" /></label>
			<input type="submit" value="share" />
		</form>`;
}
