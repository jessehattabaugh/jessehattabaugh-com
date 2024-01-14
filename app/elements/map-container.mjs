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
		<div id="${containerId}" hx-swap-oob="true">
			${num
				.map((_, i) => {
					const x = i + parseInt(xOffset);
					return num
						.map((__, j) => {
							const y = j + parseInt(yOffset);
							return html`<img
								src="https://picsum.photos/seed/${x.toString()},${y.toString()}/${width}/${height}"
								style="left: ${(x * w).toString()}px; top: ${(y * h).toString()}px;"
								${
									// center image doesn't trigger intersection observer
									i != 1 || j != 1
										? `hx-trigger="intersect root:#${containerId} threshold:0.75"
									  hx-get="${src}?xOffset=${x.toString()},yOffset=${y.toString()}"`
										: ''
								}
							/>`;
						})
						.join('');
				})
				.join('')}
		</div>
		<script>
			const map = document.getElementById('${containerId}');
			function scrollContainer(event) {
				map.scrollLeft = ${width};
				map.scrollTop = ${height};
			}
			document.addEventListener('DOMContentLoaded', scrollContainer);
			map.addEventListener('htmx:beforeSwap', scrollContainer);
		</script>`;
}
