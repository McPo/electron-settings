'use strict';

const encryptjs = require('encryptjs');
const fs = require('fs-extra');

export function outputEncryptedJsonSync(filePath, obj, key) {
			fs.writeFileSync(filePath, encryptjs.encrypt(JSON.stringify(obj), key, 256));
}

export function readEncryptedJsonSync(filePath, key) {
		return JSON.parse(encryptjs.decrypt(fs.readFileSync(filePath), 'helloworld', 256));
}
