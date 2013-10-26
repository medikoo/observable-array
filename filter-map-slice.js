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

  , forEach = Array.prototype.forEach, pop = Array.prototype.pop
  , push = Array.prototype.push, reverse = Array.prototype.reverse
  , shift = Array.prototype.shift, slice = Array.prototype.slice
  , sort = Array.prototype.sort, splice = Array.prototype.splice
  , unshift = Array.prototype.unshift, bind = Function.prototype.bind
  , max = Math.max, defineProperties = Object.defineProperties
  , hasOwnProperty = Object.prototype.hasOwnProperty
  , invokeDispose = invoke('_dispose');

require('memoizee/lib/ext/ref-counter');
require('memoizee/lib/ext/resolvers');
require('memoizee/lib/ext/dispose');

module.exports = memoize(function (ObservableArray) {
	var ReadOnly = createReadOnly(validFunction(ObservableArray));

	defineProperties(ObservableArray.prototype, memoizeMethods({
		slice: d(function (start, end) {
			var result, refresh, listener, disposed, rStart, rEnd, recalculate;
			if ((((start > 0) && (end >= 0)) || ((start < 0) && (end < 0))) &&
					(start >= end)) {
				return new ReadOnly();
			}
			refresh = function () {
				var changed, i, s = rStart;
				if (result.length !== (rEnd - rStart)) {
					result.length = rEnd - rStart;
					changed = true;
				}
				result.length = rEnd - rStart;
				i = 0;
				while (s !== rEnd) {
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
			if ((start === 0) && (end === Infinity)) {
				// Pure copy
				rStart = 0;
				result = ReadOnly.from(this);
				this.on('change', listener = function (type, arg1, arg2) {
					if (type === 'pop') {
						pop.call(result);
						result.emit('change', 'pop', arg1);
					} else if (type === 'push') {
						push.apply(result, arg1);
						result.emit('change', 'push', arg1);
					} else if (type === 'reverse') {
						reverse.call(result);
						result.emit('change', 'reverse');
					} else if (type === 'shift') {
						shift.call(result);
						result.emit('change', 'shift', arg1);
					} else if (type === 'sort') {
						sort.call(result, arg1);
						result.emit('change', 'sort', arg1);
					} else if (type === 'splice') {
						arg2 = splice.apply(result, arg1);
						result.emit('change', 'splice', arg1, arg2);
					} else if (type === 'unshift') {
						unshift.apply(result, arg1);
						result.emit('change', 'unshift', arg1);
					} else {
						rEnd = this.length;
						refresh();
						result.emit('change');
					}
				});
			} else {
				result = new ReadOnly();
				recalculate = function () {
					var l = this.length;
					rStart = start;
					rEnd = end;
					if (rStart < 0) rStart = max(l + rStart, 0);
					else if (rStart > l) rStart = l;
					if (rEnd < 0) rEnd = max(l + rEnd, 0);
					else if (rEnd > l) rEnd = l;
					if (rStart > rEnd) rStart = rEnd;
				}.bind(this);
				recalculate();
				refresh();
				this.on('change', listener = function (type, arg1, arg2) {
					if (type === 'pop') {
						if ((rEnd === (this.length + 1)) && (rStart !== rEnd)) {
							pop.call(result);
							recalculate();
							result.emit('change', 'pop', arg1);
						} else {
							recalculate();
						}
					} else if (type === 'push') {
						recalculate();
						if ((rEnd > (this.length - arg1.length)) && (rStart !== rEnd)) {
							if (rEnd !== this.length) {
								arg1 = slice.call(arg1, 0, arg1.length - (this.length - rEnd));
							}
							push.apply(result, arg1);
							result.emit('change', 'push', arg1);
						}
					} else {
						recalculate();
						if (refresh()) result.emit('change');
					}
				});
			}
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
