/**
 * Minimal CBOR decoder for WebAuthn attestation objects and COSE keys.
 * Handles: uint, negint, bstr, tstr, array, map, tag (value skipped).
 * @param {Uint8Array} bytes
 * @returns {unknown}
 */
export function decodeCbor(bytes) {
	let offset = 0;

	function readByte() {
		if (offset >= bytes.length) {
			throw new Error('CBOR decode overflow');
		}
		return bytes[offset++];
	}

	/** @param {number} len */
	function readByteSpan(len) {
		if (offset + len > bytes.length) {
			throw new Error('CBOR byte string is truncated');
		}
		const slice = bytes.slice(offset, offset + len);
		offset += len;
		return slice;
	}

	/** Read a big-endian unsigned integer of `len` bytes. */
	/** @param {number} len */
	function readUint(len) {
		if (offset + len > bytes.length) {
			throw new Error('CBOR integer is truncated');
		}
		let value = 0;
		for (let i = 0; i < len; i++) {
			value = value * 256 + bytes[offset + i];
		}
		offset += len;
		return value;
	}

	/** @param {number} info */
	function readLength(info) {
		if (info <= 23) {
			return info;
		}
		if (info === 24) {
			return readByte();
		}
		if (info === 25) {
			return readUint(2);
		}
		if (info === 26) {
			return readUint(4);
		}
		if (info === 27) {
			return readUint(8);
		}
		throw new Error(`Unsupported CBOR additional info: ${info}`);
	}

	/** @returns {unknown} */
	function read() {
		const byte = readByte();
		const major = byte >> 5;
		const info = byte & 0x1f;

		if (major === 6) {
			readLength(info); // consume tag number bytes
			return read();
		} // tag — skip to tagged value
		const length = readLength(info);

		switch (major) {
			case 0:
				return length; // unsigned int
			case 1:
				return -1 - length; // negative int
			case 2:
				return readByteSpan(length); // byte string
			case 3:
				return new TextDecoder().decode(readByteSpan(length)); // text string
			case 4: {
				// array
				const arr = [];
				for (let i = 0; i < length; i++) {
					arr.push(read());
				}
				return arr;
			}
			case 5: {
				// map
				const map = new Map();
				for (let i = 0; i < length; i++) {
					const k = read();
					const v = read();
					map.set(k, v);
				}
				return map;
			}
			default:
				throw new Error(`Unsupported CBOR major type: ${major}`);
		}
	}

	return read();
}
