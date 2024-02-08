/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html, state }) {
	const { action, method = 'GET' } = state.attrs;
	const METHOD = method.toUpperCase();
	const isGet = METHOD == 'GET';
	const isPost = METHOD == 'POST';

	return html`<form ${isGet ? '' : `method="POST"`} action="${action}">
		${isGet || isPost ? '' : html`<input type="hidden" name="method" value="${METHOD}" />`}
		<slot></slot>
		<slot name="submit"><button type="submit">${method}</button></slot>
	</form>`;
}
