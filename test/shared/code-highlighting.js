import { expect } from '@playwright/test';
import sharp from 'sharp';

/** @param {import('@playwright/test').Locator} example */
export async function expectHighlightedCode(example) {
	await expect.poll(async () => {
		const screenshot = await example.screenshot({ scale: 'css' });
		const pixels = await sharp(screenshot).removeAlpha().raw().toBuffer();
		let warm = 0;
		let cool = 0;
		for (let offset = 0; offset < pixels.length; offset += 3) {
			const red = pixels[offset];
			const green = pixels[offset + 1];
			const blue = pixels[offset + 2];
			// Count bright pixels in distinct hues, allowing for antialiasing.
			if (green < 128) { continue; }
			if (red - blue >= 30) { warm++; }
			if (blue - red >= 30) { cool++; }
			if (warm >= 10 && cool >= 10) { return true; }
		}
		return false;
	}, { message: 'The code example paints both warm and cool syntax colors' }).toBe(true);
}
