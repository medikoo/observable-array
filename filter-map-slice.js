'use strict';

var invoke         = require('es5-ext/function/invoke')
  , validFunction  = require('es5-ext/function/valid-function')
  , toInt          = require('es5-ext/number/to-int')
  , eq             = require('es5-ext/object/eq')
  , callable       = require('es5-ext/object/valid-callable')
  , value          = require('es5-ext/object/valid-value')
  , d              = require('d/d')
  , memoize        = require('memoizee/lib/regular')
  , memoizeMethods = require('memoizee/lib/d')(memoize)
  , createReadOnly = require('./create-read-only')

  , forEach = Array.prototype.forEach
  , bind = Function.prototype.bind, max = Math.max
  , defineProperties = Object.defineProperties
  , hasOwnProperty = Object.prototype.hasOwnProperty
  , invokeDispose = invoke('_dispose');

require('memoizee/lib/ext/ref-counter');
require('memoizee/lib/ext/resolvers');
require('memoizee/lib/ext/dispose');

module.exports = memoize(function (ObservableArray) {
	var ReadOnly = createReadOnly(validFunction(ObservableArray));

	defineProperties(ObservableArray.prototype, memoizeMethods({
		slice: d(function (start, end) {
			var result, refresh, listener, disposed;
			result = new ReadOnly();
			refresh = function () {
				var s = start, e = end, length = this.length, changed, i;
				if (s < 0) s = max(length + s, 0);
				else if (s > length) s = length;
				if (e < 0) e = max(length + e, 0);
				else if (e > length) e = length;
				if (s > e) s = e;
				if ((e - s) !== result.length) changed = true;
				result.length = e - s;
				i = 0;
				while (s !== e) {
					if (hasOwnProperty.call(this, s)) {
						if (!hasOwnProperty.call(result, i) || !eq(result[i], this[s])) {
							changed = true;
							result[i] = this[s];
						}
					} else if (hasOwnProperty.call(result, i)) {
						changed = true;
						delete result[i];
					}
					++i;
					++s;
				}
				return changed;
			}.bind(this);
			refresh();
			this.on('change', listener = function () {
				if (refresh()) result.emit('change');
			});
			defineProperties(result, {
				unref: d(function () {
					if (disposed) return;
					this.slice.clearRef(start, end);
				}.bind(this)),
				_dispose: d(function () {
					this.off('change', listener);
					disposed = true;
				}.bind(this))
			});
			return result;
		}, { resolvers: [toInt,
			function (val) { return (val === undefined) ? Infinity : toInt(val); }],
			refCounter: true, dispose: invokeDispose }),

		filter: d(function (callbackFn/*, thisArg*/) {
			var result, listener, refresh, thisArg, cb, disposed;
			(value(this) && callable(callbackFn));
			thisArg = arguments[1];
			cb = memoize(bind.call(callbackFn, thisArg), { length: 1 });
			result = new ReadOnly();
			refresh = function () {
				var i = 0, changed;
				forEach.call(this, function (val, j, self) {
					if (cb(val, j, self)) {
						if (!hasOwnProperty.call(result, i) || !eq(result[i], val)) {
							changed = true;
							result[i] = val;
						}
						++i;
					}
				});
				if (result.length !== i) {
					changed = true;
					result.length = i;
				}
				return changed;
			}.bind(this);
			refresh();
			this.on('change', listener = function () {
				if (refresh()) result.emit('change');
			});
			defineProperties(result, {
				refresh: d(function (index) {
					var filtered;
					index = index >>> 0;
					if (!this.hasOwnProperty(index)) return;
					filtered = Boolean(cb(this[index]));
					cb.clear(this[index]);
					if (Boolean(cb(this[index])) !== filtered) listener();
				}.bind(this)),
				refreshAll: d(function () {
					cb.clearAll();
					listener();
				}),
				unref: d(function () {
					if (disposed) return;
					this.filter.clearRef(callbackFn, thisArg);
				}.bind(this)),
				_dispose: d(function () {
					this.off('change', listener);
					disposed = true;
				}.bind(this))
			});
			return result;
		}, { length: 2, refCounter: true, dispose: invokeDispose }),
		map: d(function (callbackFn/*, thisArg*/) {
			var result, listener, refresh, thisArg, disposed, cb;
			(value(this) && callable(callbackFn));
			thisArg = arguments[1];
			cb = memoize(bind.call(callbackFn, thisArg), { length: 1 });
			result = new ReadOnly();
			refresh = function () {
				var changed;
				if (result.length !== this.length) {
					changed = true;
					result.length = this.length;
				}
				forEach.call(this, function (val, i, self) {
					val = cb(val, i, self);
					if (!hasOwnProperty.call(result, i) || !eq(result[i], val)) {
						changed = true;
						result[i] = val;
					}
				});
				return changed;
			}.bind(this);
			refresh();
			this.on('change', listener = function () {
				if (refresh()) result.emit('change');
			});
			defineProperties(result, {
				refresh: d(function (index) {
					var val;
					index = index >>> 0;
					if (!this.hasOwnProperty(index)) return;
					val = cb(this[index]);
					cb.clear(this[index]);
					if (!eq(cb(this[index]), val)) listener();
				}.bind(this)),
				refreshAll: d(function () {
					cb.clearAll();
					listener();
				}),
				unref: d(function () {
					if (disposed) return;
					this.map.clearRef(callbackFn, thisArg);
				}.bind(this)),
				_dispose: d(function () {
					this.off('change', listener);
					disposed = true;
				}.bind(this))
			});
			return result;
		}, { length: 2, refCounter: true, dispose: invokeDispose })
	}));

	return ObservableArray;
});
