/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html, state }) {
	const { attrs, store } = state;
	const { xOffset = 0, yOffset = 0 } = store;
	const { id, width, height, src } = attrs;
	const w = parseInt(width);
	const h = parseInt(height);
	const num = new Array(3).fill('');
	const containerId = `${id}-container`;

	return html`<style>
			:host {
				display: block;
				overflow: hidden;
			}
			#${containerId} {
				display: block;
				height: ${height}px;
				outline: 1px dashed red;
				overflow: scroll;
				position: relative;
				width: ${width}px;
			}
			img {
				height: ${height}px;
				outline: 1px dashed green;
				position: absolute;
				width: ${width}px;
			}
		</style>
		<div
			hx-on::load="this.scrollLeft = ${width}; this.scrollTop = ${height};"
			hx-select="#${containerId} > *"
			hx-target="this"
			id="${containerId}"
		>
			${num
				.map((_, i) => {
					const x = i - 1 + xOffset;
					return num
						.map((__, j) => {
							const y = j - 1 + yOffset;
							return html`<img
								loading="lazy"
								src="https://picsum.photos/seed/${x.toString()},${y.toString()}/${width}/${height}"
								style="left: ${(i * w).toString()}px; top: ${(j * h).toString()}px;"
								${
									// center image doesn't trigger intersection observer
									i != 1 || j != 1
										? `
											hx-get="${src}"
											hx-trigger="intersect root:#${containerId} threshold:0.75"
											hx-vals='{"xOffset":"${x.toString()}", "yOffset":"${y.toString()}"}'
										`
										: ''
								}
							/>`;
						})
						.join('');
				})
				.join('')}
		</div>`;
}
