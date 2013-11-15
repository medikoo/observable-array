'use strict';

var aFrom          = require('es5-ext/array/from')
  , validFunction  = require('es5-ext/function/valid-function')
  , mixin          = require('es5-ext/object/mixin-prototypes')
  , setPrototypeOf = require('es5-ext/object/set-prototype-of')
  , ee             = require('event-emitter/lib/core')
  , d              = require('d/d')
  , memoize        = require('memoizee/lib/regular')

  , isArray = Array.isArray
  , create = Object.create, defineProperty = Object.defineProperty
  , defineProperties = Object.defineProperties
  , getDescriptor = Object.getOwnPropertyDescriptor
  , getPrototypeOf = Object.getPrototypeOf
  , readOnlyThrow;

readOnlyThrow = d(function () { throw new RangeError("Array is read-only"); });

module.exports = memoize(function (Constructor) {
	var ReadOnly, descs;

	validFunction(Constructor);
	if (!isArray(new Constructor())) {
		throw new TypeError(Constructor + "is not an array constructor");
	}
	ReadOnly = function (len) {
		var arr, proto = (this instanceof ReadOnly) ?
				getPrototypeOf(this) : ReadOnly.prototype;
		arr = Array.apply(null, arguments);
		if (setPrototypeOf) setPrototypeOf(arr, proto);
		else mixin(arr, proto);
		return arr;
	};
	if (setPrototypeOf) setPrototypeOf(ReadOnly, Constructor);
	if (!ReadOnly.from) defineProperty(ReadOnly, 'from', d(aFrom));

	ReadOnly.prototype = ee(create(Constructor.prototype, {
		constructor: d(ReadOnly)
	}));

	descs = {};
	['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift', 'set']
		.forEach(function (name) {
			if (!Constructor.prototype[name]) return;
			descs[name] = readOnlyThrow;
			descs['_' + name] = getDescriptor(Constructor.prototype, name);
		});
	defineProperties(ReadOnly.prototype, descs);

	return ReadOnly;
});
