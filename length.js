'use strict';

var validFunction        = require('es5-ext/function/valid-function')
  , d                    = require('d/d')
  , lazy                 = require('d/lazy')
  , memoize              = require('memoizee/lib/regular')
  , validObservableArray = require('./valid-observable-array')
  , ReadOnly             = require('observable-value/create-read-only')(
	require('observable-value/value')
)
  , defineProperties = Object.defineProperties;

module.exports = memoize(function (ObservableArray) {
	validFunction(ObservableArray);
	validObservableArray(ObservableArray.prototype);

	defineProperties(ObservableArray.prototype, lazy({
		_length: d(function () {
			var current = this.length, result = new ReadOnly(current);
			this.on('change', function () { result._setValue(this.length); });
			return result;
		})
	}));

	return ObservableArray;
});
