'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var clone = require('clone');
var equal = require('deep-equal');

var Observer = function () {

  /**
   * Creates a new observer instance.
   *
   * @param {Settings} settings
   * @param {string} keyPath
   * @param {Function} handler
   */
  function Observer(settings, keyPath, handler) {
    _classCallCheck(this, Observer);

    /**
     * Reference to the settings instance.
     *
    * @type Settings
    * @private
     */
    this._settings = settings;

    /**
     * The observed key path.
     *
     * @type string
     * @private
     */
    this._keyPath = keyPath;

    /**
     * The change handler.
     *
     * @type Function
     * @private
     */
    this._handler = handler;

    /**
     * The current value of the key path.
     *
     * @type any
     * @default null
     * @private
     */
    this._currentValue = this._settings.getSync(keyPath);

    /**
     * Called when the settings file is written.
     *
     * @type Function
     * @private
     */
    this._handleWrite = this._onWrite.bind(this);

    return this._init();
  }

  /**
   * Initializes the key path observer.
   *
   * @returns {Object} this
   * @private
   */


  _createClass(Observer, [{
    key: '_init',
    value: function _init() {
      this._settings.on('write', this._handleWrite);

      return this;
    }

    /**
     * Called when the settings fileis written.
     *
     * @private
     */

  }, {
    key: '_onWrite',
    value: function _onWrite() {
      var oldValue = this._currentValue;
      var newValue = this._settings.getSync(this._keyPath);

      if (!equal(newValue, oldValue)) {
        this._currentValue = clone(newValue);
        this._handler.call(this, {
          oldValue: oldValue,
          newValue: newValue
        });
      }
    }

    /**
     * Disposes of the key path observer.
     */

  }, {
    key: 'dispose',
    value: function dispose() {
      this._settings.off('write', this._handleWrite);

      this._settings = null;
      this._keyPath = null;
      this._handler = null;
      this._currentValue = null;
      this._handleWrite = null;
    }
  }]);

  return Observer;
}();

module.exports = Observer;