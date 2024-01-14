/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html }) {
	return html`<style>
		:host {
			outline: 1px dashed green;
			width: 100%;
			height: 100%;
			display: block;
			position: absolute;
		}
	</style>`;
}
