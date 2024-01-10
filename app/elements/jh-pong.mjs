/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html }) {
	return html`<style>
			:root {
				--ballSize: 5%;
				--half: calc(var(--hund) / 2);
				--hund: 100%;
				--centerAdjust: calc(-1 * var(--half));
				--paddleHeight: 10%;
				--paddleWidth: 5%;
			}
			:host {
				display: block;
				font-size: 10vw;
				height: var(--hund);
				margin: inherit;
				padding: inherit;
				position: relative;
				width: var(--hund);
				overflow: hidden;
			}
			#theTable {
				background: black;
				display: flex;
				height: var(--hund);
				width: var(--hund);
			}
			#computerScore,
			#playerScore {
				height: var(--hund);
				text-align: center;
				vertical-align: top;
				width: calc(var(--hund) / 2);
			}
			#playerScore {
				border-right: 0.1em dashed var(--color-accent);
			}
			#computerPaddle,
			#playerPaddle {
				background-color: var(--color-accent);
				height: var(--paddleHeight);
				left: 0%;
				position: absolute;
				top: var(--half);
				transform: translateY(var(--centerAdjust));
				transition: top 0.1s ease-out;
				width: var(--paddleWidth);
			}
			#computerPaddle {
				left: calc(var(--hund) - var(--paddleWidth));
			}
			#theBall {
				background-color: var(--color-accent);
				height: var(--ballSize);
				left: var(--half);
				position: absolute;
				top: var(--half);
				transform: translateY(var(--centerAdjust)) translateX(var(--centerAdjust));
				/*transition: top 0.1s ease-out, left 0.1s ease-out;*/
				width: var(--ballSize);
			}
			.debug {
				outline: 5px dashed red;
			}
		</style>
		<div id="theTable">
			<div id="playerScore">0</div>
			<div id="computerScore">0</div>
		</div>
		<div id="playerPaddle"></div>
		<div id="computerPaddle"></div>
		<div id="theBall"></div>`;
}
