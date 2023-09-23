/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html }) {
	return html`<style>
			:root {
				outline: 0.1em dashed red;
			}
			:host {
				outline: 0.1em dashed green;
			}
			#theWorld {
				outline: 0.1em dashed blue;
			}
			#thePlayer {
				outline: 0.1em dashed yellow;
			}
		</style>
		<div id="theWorld"></div>
		<div id="thePlayer"></div>`;
}
