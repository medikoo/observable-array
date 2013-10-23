'use strict';

var validFunction  = require('es5-ext/function/valid-function')
  , mixin          = require('es5-ext/object/mixin-prototypes')
  , setPrototypeOf = require('es5-ext/object/set-prototype-of')
  , ee             = require('event-emitter/lib/core')
  , d              = require('d/d')
  , memoize        = require('memoizee/lib/regular')

  , create = Object.create, defineProperties = Object.defineProperties
  , getDescriptor = Object.getOwnPropertyDescriptor
  , getPrototypeOf = Object.getPrototypeOf
  , readOnlyThrow;

readOnlyThrow = d(function () { throw new RangeError("Array is read-only"); });

module.exports = memoize(function (Constructor) {
	var ReadOnly;

	validFunction(Constructor);
	ReadOnly = function (len) {
		var arr, proto = (this instanceof ReadOnly) ?
				getPrototypeOf(this) : ReadOnly.prototype;
		arr = Array.apply(null, arguments);
		if (setPrototypeOf) setPrototypeOf(arr, proto);
		else mixin(arr, proto);
		return arr;
	};
	if (setPrototypeOf) setPrototypeOf(ReadOnly, Constructor);

	ReadOnly.prototype = ee(create(Constructor.prototype, {
		constructor: d(ReadOnly)
	}));

	['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift']
		.forEach(function (name) {
			var descs = {};
			descs[name] = readOnlyThrow;
			descs['_' + name] = getDescriptor(Constructor.prototype, name);
			defineProperties(ReadOnly.prototype, descs);
		});

	return ReadOnly;
});
