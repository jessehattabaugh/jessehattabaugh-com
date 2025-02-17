/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html, state }) {
	const { store } = state;
	const { isAuthorized } = store;
	return html`<form>
		<label>Resolution Width (in pixels): <input type="number" name="width" min="1">px</label>
		<label>Resolution Height (in pixels): <input type="number" name="height" min="1">px</label>
		<label>Screen size (measured diagonally, in inches): <input type="number" name="size" min="1">in</label>
	</form>`;
}
