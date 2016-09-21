'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.outputEncryptedJson = outputEncryptedJson;
exports.readEncryptedJson = readEncryptedJson;
exports.outputEncryptedJsonSync = outputEncryptedJsonSync;
exports.readEncryptedJsonSync = readEncryptedJsonSync;
var encryptjs = require('encryptjs');
var fs = require('fs-extra');

function outputEncryptedJson(filePath, obj, key, callback) {
	fs.writeFile(filePath, encryptjs.encrypt(JSON.stringify(obj), key, 256), callback);
}

function readEncryptedJson(filePath, key, callback) {
	fs.readFile(filePath, function (err, ciphertext) {
		if (err) callback(err, null);else callback(err, JSON.parse(encryptjs.decrypt(ciphertext, key, 256)));
	});
}

function outputEncryptedJsonSync(filePath, obj, key) {
	fs.writeFileSync(filePath, encryptjs.encrypt(JSON.stringify(obj), key, 256));
}

function readEncryptedJsonSync(filePath, key) {
	return JSON.parse(encryptjs.decrypt(fs.readFileSync(filePath), key, 256));
}