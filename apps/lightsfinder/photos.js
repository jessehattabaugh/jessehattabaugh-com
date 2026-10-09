/** Detect supported raster files by bytes, not a client-supplied MIME type.
 * Strip metadata on the server too: no GPS EXIF is published with the image.
 * @param {ArrayBuffer} buffer */
export function cleanPhoto(buffer) {
	const bytes = new Uint8Array(buffer);
	if (bytes.length < 16 || bytes.length > 750000) { return null; }
	const decoder = new TextDecoder();
	/** @type {Uint8Array[]} */
	const parts = [];
	let mime;
	if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9) {
		mime = 'image/jpeg'; parts.push(bytes.slice(0, 2));
		let offset = 2;
		while (offset < bytes.length) {
			if (bytes[offset] !== 0xff) { return null; }
			const marker = bytes[offset + 1];
			if (marker === 0xda) { parts.push(bytes.slice(offset)); break; }
			const length = bytes[offset + 2] * 256 + bytes[offset + 3];
			if (length < 2 || offset + length + 2 > bytes.length) { return null; }
			if (![0xe1, 0xed, 0xfe].includes(marker)) { parts.push(bytes.slice(offset, offset + length + 2)); }
			offset += length + 2;
		}
	} else if (bytes.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10') {
		mime = 'image/png'; parts.push(bytes.slice(0, 8));
		let offset = 8, ended = false;
		const view = new DataView(buffer);
		while (offset + 12 <= bytes.length) {
			const length = view.getUint32(offset), type = decoder.decode(bytes.slice(offset + 4, offset + 8));
			if (offset + length + 12 > bytes.length) { return null; }
			// Preserve critical pixel chunks and transparency; discard text/EXIF/location metadata.
			if (['IHDR', 'PLTE', 'IDAT', 'IEND', 'tRNS'].includes(type)) { parts.push(bytes.slice(offset, offset + length + 12)); }
			offset += length + 12;
			if (type === 'IEND') { ended = true; break; }
		}
		if (!ended) { return null; }
	} else if (decoder.decode(bytes.slice(0, 4)) === 'RIFF' && decoder.decode(bytes.slice(8, 12)) === 'WEBP') {
		mime = 'image/webp'; parts.push(bytes.slice(0, 12));
		const view = new DataView(buffer);
		for (let offset = 12; offset + 8 <= bytes.length;) {
			const type = decoder.decode(bytes.slice(offset, offset + 4)), size = view.getUint32(offset + 4, true);
			const end = offset + 8 + size + size % 2;
			if (end > bytes.length) { return null; }
			if (type !== 'EXIF' && type !== 'XMP ') {
				const chunk = bytes.slice(offset, end);
				if (type === 'VP8X') { chunk[8] &= ~0x0c; }
				parts.push(chunk);
			}
			offset = end;
		}
	} else { return null; }
	const cleaned = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
	let offset = 0; for (const part of parts) { cleaned.set(part, offset); offset += part.length; }
	if (mime === 'image/webp') { new DataView(cleaned.buffer).setUint32(4, cleaned.length - 8, true); }
	return { mime, image: cleaned.buffer };
}
