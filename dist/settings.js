'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var assert = require('assert');
var debug = require('debug')('electron-settings');
var deepExtend = require('deep-extend');
var clone = require('clone');
var electron = require('electron');
var exists = require('file-exists');
var fs = require('fs-extra');
var helpers = require('key-path-helpers');
var path = require('path');

var _require = require('events');

var EventEmitter = _require.EventEmitter;


var Encryptor = require('./encryptor');
var Observer = require('./observer');

/**
 * Obtain a reference to the Electron app. If electron-settings is required
 * within the context of a renderer view, we need to import it via remote.
 *
 * @see http://electron.atom.io/docs/api/app
 * @type Object
 */
var app = electron.app || electron.remote.app;

/**
 * The Settings class.
 *
 * @extends events.EventEmitter
 */

var Settings = function (_EventEmitter) {
  _inherits(Settings, _EventEmitter);

  function Settings() {
    _classCallCheck(this, Settings);

    /**
     * Default settings.
     *
     * @type Object
     * @private
     */
    var _this = _possibleConstructorReturn(this, (Settings.__proto__ || Object.getPrototypeOf(Settings)).call(this));

    _this._defaults = {};

    // Handle "create" events.
    _this.addListener(Settings.Events.CREATE, _this._onCreate.bind(_this));

    // Handle "write" events.
    _this.addListener(Settings.Events.WRITE, _this._onWrite.bind(_this));
    return _this;
  }

  /**
   * Configures electron-settings global default options.
   *
   * @param {Object} options
   * @private
   */


  _createClass(Settings, [{
    key: '_configureGlobalSettings',
    value: function _configureGlobalSettings(options) {
      var opts = this._extendDefaultOptions(options);

      Settings.DefaultOptions = opts;

      debug('global settings configured to ' + JSON.stringify(opts));
    }

    /**
     * Sets electron-settings default settings. These will be applied upon
     * settings file creation, as well as `applyDefaults()` and
     * `resetToDefaults()`.
     *
     * @param {Object} obj
     * @private
     */

  }, {
    key: '_setDefaults',
    value: function _setDefaults(obj) {
      this._defaults = clone(obj);
    }

    /**
     * Parses save options and ensures that default values are set if they are
     * not provided.
     *
     * @param {Object} [options={}]
     * @param {boolean} [options.atomicSaving=true]
     * @param {boolean} [options.prettify=false]
     * @param {boolean} [options.overwrite=false]
     * @returns {Object}
     * @private
     */

  }, {
    key: '_extendDefaultOptions',
    value: function _extendDefaultOptions() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      return Object.assign({}, Settings.DefaultOptions, options);
    }

    /**
     * Deletes the settings file. This may occur if the data has become corrupted
     * and can no longer be read.
     *
     * @private
     */

  }, {
    key: '_unlinkSettingsFileSync',
    value: function _unlinkSettingsFileSync() {
      var pathToSettings = this.getSettingsFilePath();

      try {
        fs.unlinkSync(pathToSettings);

        debug('settings file deleted at ' + pathToSettings);
      } catch (e) {
        // Either the file doesn't exist, or you're totally fucked.
        // But probably the former.. ¯\_(ツ)_/¯
      }
    }

    /**
     * Deletes the settings file and re-ensures its existence with default
     * settings if possible. This is the doomsday scenario.
     *
     * @private
     */

  }, {
    key: '_resetSettingsFileSync',
    value: function _resetSettingsFileSync() {
      this._unlinkSettingsFileSync();
      this._ensureSettingsFileSync();
    }

    /**
     * Checks if the settings file exists on the disk. If it does not, it is
     * created with an empty object as its contents.
     *
     * @returns {Promise}
     * @private
     */

  }, {
    key: '_ensureSettingsFile',
    value: function _ensureSettingsFile() {
      var _this2 = this;

      return new Promise(function (resolve, reject) {
        if (!_this2.settingsFileExists()) {
          var defaults = _this2._defaults;

          _this2._writeSettingsFile(defaults).then(function () {
            _this2._emitCreateEvent();
            resolve();
          }, reject);
        } else {
          resolve();
        }
      });
    }

    /**
     * The synchronous version of `_ensureSettingsFile()`.
     *
     * @see _ensureSettingsFile
     * @private
     */

  }, {
    key: '_ensureSettingsFileSync',
    value: function _ensureSettingsFileSync() {
      if (!this.settingsFileExists()) {
        var defaults = this._defaults;

        this._writeSettingsFileSync(defaults);
        this._emitCreateEvent();
      }
    }

    /**
     * Reads the settings file from the disk and parses the contents as JSON.
     *
     * @returns {Promise}
     * @private
     */

  }, {
    key: '_readSettingsFile',
    value: function _readSettingsFile() {
      var _this3 = this;

      var opts = Settings.DefaultOptions;
      return new Promise(function (resolve, reject) {
        _this3._ensureSettingsFile().then(function () {
          var pathToSettings = _this3.getSettingsFilePath();

          var readCompleted = function readCompleted(err, obj) {
            if (err) {
              debug('ERROR: malformed JSON detected at ' + pathToSettings);

              _this3._resetSettingsFileSync();

              reject(err);
            } else {
              resolve(obj);
            }
          };

          if (opts.key) Encryptor.readEncryptedJson(pathToSettings, opts.key, readCompleted);else fs.readJson(pathToSettings, readCompleted);
        }, reject);
      });
    }

    /**
     * The synchronous version of `_readSettingsFile()`.
     *
     * @see _readSettingsFile
     * @returns {Object} obj
     * @private
     */

  }, {
    key: '_readSettingsFileSync',
    value: function _readSettingsFileSync() {
      var opts = Settings.DefaultOptions;
      this._ensureSettingsFileSync();

      var pathToSettings = this.getSettingsFilePath();

      try {
        var obj = opts.key ? Encryptor.readEncryptedJsonSync(pathToSettings, opts.key) : fs.readJsonSync(pathToSettings);

        return obj;
      } catch (e) {
        debug('ERROR: malformed JSON detected at ' + pathToSettings);

        this._resetSettingsFileSync();
      }
    }

    /**
     * Parses the given object to a JSON string and saves it to the disk. If
     * atomic saving is enabled, then we firt save a temp file, and once it has
     * been successfully written, we overwrite the old settings file.
     *
     * @param {Object} obj
     * @param {Object} [options]
     * @returns {Promise}
     * @private
     */

  }, {
    key: '_writeSettingsFile',
    value: function _writeSettingsFile(obj, options) {
      var _this4 = this;

      var opts = this._extendDefaultOptions(options);
      var pathToSettings = this.getSettingsFilePath();
      var spaces = opts.prettify ? 2 : 0;

      return new Promise(function (resolve, reject) {
        if (opts.atomicSaving) {
          (function () {
            var tmpFilePath = pathToSettings + '-tmp';

            var outputCompleted = function outputCompleted(err) {
              if (!err) {
                fs.rename(tmpFilePath, pathToSettings, function (err) {
                  if (err) {
                    reject(err);
                  } else {
                    _this4._emitWriteEvent();
                    resolve();
                  }
                });
              } else {
                fs.unlink(tmpFilePath, function () {
                  _this4._resetSettingsFile();
                  return reject(err);
                });
              }
            };

            if (opts.key) Encryptor.outputEncryptedJson(tmpFilePath, obj, opts.key, outputCompleted);else fs.outputJson(tmpFilePath, obj, { spaces: spaces }, outputCompleted);
          })();
        } else {

          var _outputCompleted = function _outputCompleted(err) {
            if (err) {
              reject(err);
            } else {
              _this4._emitWriteEvent();
              resolve();
            }
          };

          if (opts.key) Encryptor.outputEncryptedJson(pathToSettings, obj, opts.key, _outputCompleted);else fs.outputJson(pathToSettings, obj, { spaces: spaces }, _outputCompleted);
        }
      });
    }

    /**
     * The synchronous version of `_writeSettingsFile()`.
     *
     * @see _writeSettingsFile
     * @private
     */

  }, {
    key: '_writeSettingsFileSync',
    value: function _writeSettingsFileSync(obj, options) {
      var opts = this._extendDefaultOptions(options);
      var pathToSettings = this.getSettingsFilePath();
      var spaces = opts.prettify ? 2 : 0;

      if (opts.atomicSaving) {
        var tmpFilePath = pathToSettings + '-tmp';

        try {
          if (opts.key) Encryptor.outputEncryptedJsonSync(tmpFilePath, obj, opts.key);else fs.outputJsonSync(tmpFilePath, obj, { spaces: spaces });
        } catch (e) {
          try {
            fs.unlinkSync(tmpFilePath);
          } catch (e) {
            // No operation.
          }

          return;
        }

        fs.renameSync(tmpFilePath, pathToSettings);
      } else {
        if (opts.key) Encryptor.outputEncryptedJsonSync(pathToSettings, obj, opts.key);else fs.outputJsonSync(pathToSettings, obj, { spaces: spaces });
      }

      this._emitWriteEvent();
    }

    /**
     * Emits the "create" event.
     *
     * @emits Settings#create
     */

  }, {
    key: '_emitCreateEvent',
    value: function _emitCreateEvent() {
      this.emit(Settings.Events.CREATE, this.getSettingsFilePath());
    }

    /**
     * Emits the "write" event.
     *
     * @emits Settings#save
     */

  }, {
    key: '_emitWriteEvent',
    value: function _emitWriteEvent() {
      this.emit(Settings.Events.WRITE);
    }

    /**
     * Called when the "create" event fires.
     *
     * @private
     */

  }, {
    key: '_onCreate',
    value: function _onCreate() {
      debug('settings file created at ' + this.getSettingsFilePath());
    }

    /**
     * Called when the "write" event fires.
     *
     * @private
     */

  }, {
    key: '_onWrite',
    value: function _onWrite() {
      debug('settings file written to ' + this.getSettingsFilePath());
    }

    /**
     * Checks if the chosen key path exists within the settings object.
     *
     * @throws if key path is not a string.
     * @param {string} keyPath
     * @returns {Promise}
     */

  }, {
    key: 'has',
    value: function has(keyPath) {
      var _this5 = this;

      assert.strictEqual(typeof keyPath === 'undefined' ? 'undefined' : _typeof(keyPath), 'string', 'Key path must be a string');

      return new Promise(function (resolve, reject) {
        _this5._readSettingsFile().then(function (obj) {
          var keyPathExists = helpers.hasKeyPath(obj, keyPath);

          resolve(keyPathExists);
        }, reject);
      });
    }

    /**
     * The synchronous version of `has()`.
     *
     * @see has
     */

  }, {
    key: 'hasSync',
    value: function hasSync(keyPath) {
      assert.strictEqual(typeof keyPath === 'undefined' ? 'undefined' : _typeof(keyPath), 'string', 'Key path must be a string');

      var obj = this._readSettingsFileSync();
      var keyPathExists = helpers.hasKeyPath(obj, keyPath);

      return keyPathExists;
    }

    /**
     * Gets the value at the chosen key path.
     *
     * @param {string} [keyPath]
     * @returns {Promise}
     */

  }, {
    key: 'get',
    value: function get(keyPath) {
      var _this6 = this;

      return new Promise(function (resolve, reject) {
        _this6._readSettingsFile().then(function (obj) {
          var value = obj;

          if (typeof keyPath === 'string') {
            value = helpers.getValueAtKeyPath(obj, keyPath);
          }

          resolve(value);
        }, reject);
      });
    }

    /**
     * The synchronous version of `get()`.
     *
     * @see get
     */

  }, {
    key: 'getSync',
    value: function getSync(keyPath) {
      var value = this._readSettingsFileSync();

      if (typeof keyPath === 'string') {
        value = helpers.getValueAtKeyPath(value, keyPath);
      }

      return value;
    }

    /**
     * Sets the value at the chosen key path.
     *
     * @throws if key path is not a string.
     * @throws if options is not an object.
     * @param {string} keyPath
     * @param {any} [value={}]
     * @param {Object} [options={}]
     * @returns {Promise}
     */

  }, {
    key: 'set',
    value: function set(keyPath) {
      var _this7 = this;

      var value = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
      var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

      assert.strictEqual(typeof keyPath === 'undefined' ? 'undefined' : _typeof(keyPath), 'string', 'Key path must be a string');
      assert.strictEqual(typeof options === 'undefined' ? 'undefined' : _typeof(options), 'object', 'Options must be an object');

      return new Promise(function (resolve, reject) {
        _this7._readSettingsFile().then(function (obj) {
          helpers.setValueAtKeyPath(obj, keyPath, value);

          _this7._writeSettingsFile(obj, options).then(resolve, reject);
        }, reject);
      });
    }

    /**
     * The synchronous version of `set()`.
     *
     * @see set
     */

  }, {
    key: 'setSync',
    value: function setSync(keyPath) {
      var value = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
      var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

      assert.strictEqual(typeof keyPath === 'undefined' ? 'undefined' : _typeof(keyPath), 'string', 'Key path must be a string');
      assert.strictEqual(typeof options === 'undefined' ? 'undefined' : _typeof(options), 'object', 'Options must be an object');

      var obj = this._readSettingsFileSync();

      helpers.setValueAtKeyPath(obj, keyPath, value);

      this._writeSettingsFileSync(obj, options);
    }

    /**
     * Deletes the key and value at the chosen key path.
     *
     * @throws if key path is not a string.
     * @throws if options is not an object.
     * @param {string} keyPath
     * @param {Object} [options={}]
     * @returns {Promise}
     */

  }, {
    key: 'delete',
    value: function _delete(keyPath) {
      var _this8 = this;

      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      assert.strictEqual(typeof keyPath === 'undefined' ? 'undefined' : _typeof(keyPath), 'string', 'Key path must be a string');
      assert.strictEqual(typeof options === 'undefined' ? 'undefined' : _typeof(options), 'object', 'Options must be an object');

      return new Promise(function (resolve, reject) {
        _this8._readSettingsFile().then(function (obj) {
          helpers.deleteValueAtKeyPath(obj, keyPath);

          _this8._writeSettingsFile(obj, options).then(resolve, reject);
        }, reject);
      });
    }

    /**
     * The synchronous version of `delete()`.
     *
     * @see delete
     */

  }, {
    key: 'deleteSync',
    value: function deleteSync(keyPath) {
      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      assert.strictEqual(typeof keyPath === 'undefined' ? 'undefined' : _typeof(keyPath), 'string', 'Key path must be a string');
      assert.strictEqual(typeof options === 'undefined' ? 'undefined' : _typeof(options), 'object', 'Options must be an object');

      var obj = this._readSettingsFileSync();

      helpers.deleteValueAtKeyPath(obj, keyPath);

      this._writeSettingsFileSync(obj, options);
    }

    /**
     * Clears all settings and replaces the file contents with an empty object.
     *
     * @throws if options is not an object.
     * @param {Object} [options={}]
     * @param {boolean} [options.atomicSaving=true]
     * @param {boolean} [options.prettify=false]
     * @returns {Promise}
     */

  }, {
    key: 'clear',
    value: function clear() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      assert.strictEqual(typeof options === 'undefined' ? 'undefined' : _typeof(options), 'object', 'Options must be an object');

      return this._writeSettingsFile({}, options);
    }

    /**
     * The synchronous version of `clear()`.
     *
     * @see clear
     */

  }, {
    key: 'clearSync',
    value: function clearSync() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      assert.strictEqual(typeof options === 'undefined' ? 'undefined' : _typeof(options), 'object', 'Options must be an object');

      this._writeSettingsFileSync({}, options);
    }

    /**
     * Sets default settings.
     *
     * @throws if defaults is not an object.
     * @param {Object} [options={}
     * @returns {Promise}
     */

  }, {
    key: 'defaults',
    value: function defaults(_defaults) {
      assert.strictEqual(typeof _defaults === 'undefined' ? 'undefined' : _typeof(_defaults), 'object', 'Defaults must be an object');

      this._setDefaults(_defaults);
    }

    /**
     * Extends the current settings with the default settings. Optionally, you
     * may overwrite pre-existing settings with their repsective defaults by
     * setting `options.overwrite` to true. Set defaults using the `defaults()`
     * method.
     *
     * @throws if options is not an object.
     * @param {Object} [options={}]
     * @returns {Promise}
     */

  }, {
    key: 'applyDefaults',
    value: function applyDefaults() {
      var _this9 = this;

      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      assert.strictEqual(typeof options === 'undefined' ? 'undefined' : _typeof(options), 'object', 'Options must be an object');

      return new Promise(function (resolve, reject) {
        _this9._readSettingsFile().then(function (obj) {
          var newObj = void 0;

          if (options.overwrite === true) {
            newObj = deepExtend({}, obj, _this9._defaults);
          } else {
            newObj = deepExtend({}, _this9._defaults, obj);
          }

          _this9._writeSettingsFile(newObj, options).then(resolve, reject);
        });
      });
    }

    /**
     * The synchronous version of `applyDefaults()`.
     *
     * @see applyDefaults
     */

  }, {
    key: 'applyDefaultsSync',
    value: function applyDefaultsSync() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      assert.strictEqual(typeof options === 'undefined' ? 'undefined' : _typeof(options), 'object', 'Options must be an object');

      var obj = this._readSettingsFileSync();
      var newObj = void 0;

      if (options.overwrite === true) {
        newObj = deepExtend({}, obj, this._defaults);
      } else {
        newObj = deepExtend({}, this._defaults, obj);
      }

      this._writeSettingsFileSync(newObj, options);
    }

    /**
     * Resets the settings to defaults. Set defaults using the `defaults()`
     * method.
     *
     * @throws if options is not an object.
     * @param {Object} [options={}]
     * @returns {Promise}
     */

  }, {
    key: 'resetToDefaults',
    value: function resetToDefaults() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      assert.strictEqual(typeof options === 'undefined' ? 'undefined' : _typeof(options), 'object', 'Options must be an object');

      var defaults = this._defaults;

      return this._writeSettingsFile(defaults, options);
    }

    /**
     * The synchronous version of `resetToDefaults()`.
     *
     * @see resetToDefaults
     */

  }, {
    key: 'resetToDefaultsSync',
    value: function resetToDefaultsSync() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      assert.strictEqual(typeof options === 'undefined' ? 'undefined' : _typeof(options), 'object', 'Options must be an object');

      var defaults = this._defaults;

      this._writeSettingsFileSync(defaults, options);

      this._readSettingsFileSync();
    }

    /**
     * Observes the chosen key path for changes and calls the handler if the
     * value changes. Returns an Observer instance which has a `dispose` method.
     * To unsubscribe, simply call `dispose()` on the returned key path observer.
     *
     * @throws if key path is not a string.
     * @throws if handler is not a function.
     * @param {string} keyPath
     * @param {Function} handler
     * @returns {Observer}
     */

  }, {
    key: 'observe',
    value: function observe(keyPath, handler) {
      assert.strictEqual(typeof keyPath === 'undefined' ? 'undefined' : _typeof(keyPath), 'string', 'Key path must be a string');
      assert.strictEqual(typeof handler === 'undefined' ? 'undefined' : _typeof(handler), 'function', 'Handler must be a function');

      return new Observer(this, keyPath, handler);
    }

    /**
     * Globally configure electron-settings options.
     *
     * @throws if options is not an object.
     * @param {Object} options
     * @param {boolean} [options.atomicSaving=true]
     * @param {boolean} [options.prettify=false]
     * @param {Object} [options.defaults={}]
     */

  }, {
    key: 'configure',
    value: function configure(options) {
      assert.strictEqual(typeof options === 'undefined' ? 'undefined' : _typeof(options), 'object', 'Options must be an object');

      this._configureGlobalSettings(options);
    }

    /**
     * Returns the path to the settings file on the disk,
     *
     * @returns {string} settingsFilePath
     */

  }, {
    key: 'getSettingsFilePath',
    value: function getSettingsFilePath() {
      var userDataPath = app.getPath('userData');
      var settingsFilePath = path.join(userDataPath, Settings.FileName);

      return settingsFilePath;
    }

    /**
     * Checks if the settings file currently exists on the disk.
     *
     * @returns {boolean} fileExists
     */

  }, {
    key: 'settingsFileExists',
    value: function settingsFileExists() {
      var pathToSettings = this.getSettingsFilePath();
      var fileExists = exists(pathToSettings);

      return fileExists;
    }

    /**
     * Why doesn't this exist?
     *
     * @alias EventListener.removeListener
     */

  }, {
    key: 'off',
    value: function off() {
      return this.removeListener.apply(this, arguments);
    }
  }]);

  return Settings;
}(EventEmitter);

;

/**
 * Default save options.
 *
 * @type Object
 * @readonly
 */
Settings.DefaultOptions = {
  atomicSaving: true,
  prettify: false,
  overwrite: false
};

/**
 * Settings event names.
 *
 * @enum {string}
 * @readonly
 */
Settings.Events = {
  CREATE: 'create',
  WRITE: 'write'
};

/**
 * The file name for the settings file.
 *
 * @type string
 * @readonly
 */
Settings.FileName = 'Settings';

/**
 * The Settings instance.
 *
 * @type Settings
 * @readonly
 */
Settings.Instance = new Settings();

module.exports = Settings.Instance;