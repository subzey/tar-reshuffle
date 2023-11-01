import { readFileSync, writeFileSync } from 'fs';
import { gzipSync, gunzipSync } from 'node:zlib';

import { Temperer } from 'dict-tempering/base';

const textDecoder = new TextDecoder();

function * splitTar(/** @type {Uint8Array} */ contents) {
	let offset = 0;
	while (offset < contents.length) {
		if (contents[offset + 124 + 10] !== 0x20 || contents[offset + 124 + 11] !== 0x00) {
			return;
		}
		const lengthStr = textDecoder.decode(contents.subarray(offset + 124, offset + 124 + 10));
		const length = Number.parseInt(lengthStr, 8);
		const alignedLength = ((length - 1) | 511) + 1;
		yield contents.subarray(offset, offset += 512 + alignedLength);
	}
}

function glueUpTar(chunks) {
	return Buffer.concat([...chunks, Buffer.alloc(1024)]);
}

class TarTemperer extends Temperer {
	_split(contents) {
		return Array.from(splitTar(contents));
	}
	_assemble(chunks) {
		return glueUpTar(chunks);
	}
	_log(message) {
		console.log(message);
	}
}

// Please, get it from https://registry.npmjs.org/chalk/-/chalk-5.3.0.tgz
const originalTarGz = readFileSync('./chalk-5.3.0.tgz');
console.log('Original .tgz size', originalTarGz.length);
const originalTar = gunzipSync(originalTarGz);
console.log('Repacked (-9) original .tgz size', gzipSync(originalTar, {level: 9}).length);
const reshuffledTar = new TarTemperer().process(originalTar);
const reshuffledTarGz = gzipSync(reshuffledTar, {level: 9});
console.log('Reshuffled .tgz size', reshuffledTarGz.length);
writeFileSync('out.tgz', reshuffledTarGz);
