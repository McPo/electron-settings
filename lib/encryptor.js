'use strict';

const encryptjs = require('encryptjs');
const fs = require('fs-extra');

export function outputEncryptedJsonSync(filePath, obj) {
			fs.writeFileSync(filePath, encryptjs.encrypt(JSON.stringify(obj), 'helloworld', 256));
}

export function readEncryptedJsonSync(filePath) {
		return JSON.parse(encryptjs.decrypt(fs.readFileSync(filePath), 'helloworld', 256));
}
