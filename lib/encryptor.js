'use strict';

const encryptjs = require('encryptjs');
const fs = require('fs-extra');

class Encryptor {

	static outputEncryptedJsonSync() {
			fs.writeFileSync(tmpFilePath, encryptjs.encrypt(JSON.stringify(obj), 'helloworld', 256));
	}

	static readEncryptedJsonSync() {
			return JSON.parse(encryptjs.decrypt(fs.readFileSync(pathToSettings), 'helloworld', 256));
	}

}
