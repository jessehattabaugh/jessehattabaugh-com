/** @type {import('@enhance/types').EnhanceElemFn} */
export default function ({ html, state }) {
	const { width, height } = state.attrs;
	const w = parseInt(width);
	const h = parseInt(height);
	const num = new Array(3).fill('');
	return html`<style>
			:host {
				outline: 1px dashed red;
				width: ${width}px;
				height: ${height}px;
				display: block;
				position: relative;
				overflow: hidden;
			}
		</style>
		${num
			.map((_, i) => {
				const x = i - 1;
				return num
					.map((__, j) => {
						const y = j - 1;
						return html`<map-tile
							x=${x.toString()}
							y=${y.toString()}
							width=${width}
							height=${height}
							style="
								left: ${(x * w).toString()}px;
								top: ${(y * h).toString()}px;"
						></map-tile>`;
					})
					.join('');
			})
			.join('')}
		<script>
			const map = document.currentScript.parentNode;
			const tiles = map.querySelectorAll('map-tile');
			console.debug(map, tiles);

			document.addEventListener('keydown', (event) => {
				event.preventDefault();
				const { key } = event;
				//console.debug(key);
				let moveX = 0;
				let moveY = 0;
				switch (key) {
					case 'ArrowUp':
						moveY = 1;
						break;
					case 'ArrowDown':
						moveY = -1;
						break;
					case 'ArrowLeft':
						moveX = 1;
						break;
					case 'ArrowRight':
						moveX = -1;
						break;
				}
				tiles.forEach((tile) => {
					// read the tile's current transform
					const transform = tile.style.transform;

					// parse the transform string for translateX() and translateY()
					const matchX = transform.match(/translateX\\((-?\\d+)px\\)/);
					const matchY = transform.match(/translateY\\((-?\\d+)px\\)/);
					const currentX = matchX ? parseInt(matchX[1]) : 0;
					const currentY = matchY ? parseInt(matchY[1]) : 0;

					// update the transform string with the new translateX() and translateY()
					const newX = currentX + moveX;
					const newY = currentY + moveY;
					const newTransform = 'translateX(' + newX + 'px) translateY(' + newY + 'px)';
					tile.style.transform = newTransform;
					// note: other transforms will be overwritten
					//console.debug(newTransform, tile.style);
				});
			});
		</script>`;
}
