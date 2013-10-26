'use strict';

var aFrom          = require('es5-ext/array/from')
  , eIndexOf       = require('es5-ext/array/#/e-index-of')
  , isCopy         = require('es5-ext/array/#/is-copy')
  , remove         = require('es5-ext/array/#/remove')
  , invoke         = require('es5-ext/function/invoke')
  , validFunction  = require('es5-ext/function/valid-function')
  , toInt          = require('es5-ext/number/to-int')
  , eq             = require('es5-ext/object/eq')
  , callable       = require('es5-ext/object/valid-callable')
  , value          = require('es5-ext/object/valid-value')
  , d              = require('d/d')
  , memoize        = require('memoizee/lib/regular')
  , memoizeMethods = require('memoizee/lib/d')(memoize)
  , createReadOnly = require('./create-read-only')

  , filter = Array.prototype.filter, forEach = Array.prototype.forEach
  , map = Array.prototype.map, pop = Array.prototype.pop
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
					} else if (type === 'index') {
						result[arg1] = this[arg1];
						result.emit('change', 'index', arg1, arg2);
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
					} else if (type === 'index') {
						if ((rStart > arg1) || (rEnd <= arg1)) return;
						result[arg1 - rStart] = this[arg1];
						result.emit('change', 'index', arg1 - rStart, arg2);
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
			this.on('change', listener = function (type, arg1, arg2) {
				var i, tmp;
				if (type === 'pop') {
					if (!cb(arg1)) return;
					pop.call(result);
					result.emit('change', 'pop', arg1);
				} else if (type === 'push') {
					i = this.length - arg1.length;
					arg1 = filter.call(arg1, function (val) {
						return cb(val, i++, this);
					}, this);
					if (!arg1.length) return;
					push.apply(result, arg1);
					result.emit('change', 'push', arg1);
				} else if (type === 'reverse') {
					if (result.length <= 1) return;
					tmp = aFrom(result);
					reverse.call(result);
					if (!isCopy.call(result, tmp)) result.emit('change', 'reverse');
				} else if (type === 'shift') {
					if (!cb(arg1)) return;
					shift.call(result);
					result.emit('change', 'shift', arg1);
				} else if (type === 'sort') {
					if (result.length <= 1) return;
					tmp = aFrom(result);
					sort.call(result, arg1);
					if (!isCopy.call(result, tmp)) result.emit('change', 'sort', arg1);
				} else if (type === 'splice') {
					if (refresh()) result.emit('change');
				} else if (type === 'unshift') {
					arg1 = filter.call(arg1, function (val, i) {
						return cb(val, i, this);
					}, this);
					if (!arg1.length) return;
					unshift.apply(result, arg1);
					result.emit('change', 'unshift', arg1);
				} else if (type === 'index') {
					if ((arguments.length < 3) ||
							(Boolean(cb(arg2)) !== Boolean(cb(this[arg1], arg1, this)))) {
						if (refresh()) result.emit('change');
						return;
					}
				} else if (refresh()) {
					result.emit('change');
				}
			});
			defineProperties(result, {
				refresh: d(function (index) {
					var filtered;
					index = index >>> 0;
					if (!this.hasOwnProperty(index)) return;
					filtered = Boolean(cb(this[index]));
					cb.clear(this[index]);
					if (Boolean(cb(this[index])) !== filtered) {
						refresh();
						result.emit('change');
					}
				}.bind(this)),
				refreshAll: d(function () {
					cb.clearAll();
					if (refresh()) result.emit('change');
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
			this.on('change', listener = function (type, arg1) {
				var i, tmp, arg2, old;
				if (type === 'pop') {
					result.emit('change', 'pop', pop.call(result));
				} else if (type === 'push') {
					i = this.length - arg1.length;
					arg1 = map.call(arg1, function (val) {
						return cb(val, i++, this);
					}, this);
					push.apply(result, arg1);
					result.emit('change', 'push', arg1);
				} else if (type === 'reverse') {
					tmp = aFrom(result);
					reverse.call(result);
					if (!isCopy.call(result, tmp)) result.emit('change', 'reverse');
				} else if (type === 'shift') {
					result.emit('change', 'shift', shift.call(result));
				} else if (type === 'splice') {
					i = toInt(arg1);
					if (i < 0) i = this.length - i;
					arg1 = map.call(arg1, function (val, j) {
						if (j < 2) return val;
						return cb(val, i++, this);
					}, this);
					arg2 = splice.apply(result, arg1);
					if (((arg1.length <= 2) && arg2.length) ||
							!isCopy.call(arg1.slice(2), arg2)) {
						result.emit('change', 'splice', arg1, arg2);
					}
				} else if (type === 'unshift') {
					arg1 = map.call(arg1, function (val, i) {
						return cb(val, i, this);
					}, this);
					unshift.apply(result, arg1);
					result.emit('change', 'unshift', arg1);
				} else if (type === 'index') {
					tmp = cb(this[arg1], arg1, this);
					if (tmp === result[arg1]) return;
					old = result[arg1];
					result[arg1] = tmp;
					result.emit('change', 'index', arg1, old);
				} else if (refresh()) {
					result.emit('change');
				}
			});
			defineProperties(result, {
				refresh: d(function (index) {
					var val, nu;
					index = index >>> 0;
					if (!this.hasOwnProperty(index)) return;
					val = cb(this[index]);
					cb.clear(this[index]);
					nu = cb(this[index]);
					if (!eq(nu, val)) {
						result[index] = nu;
						result.emit('change', 'index', index, val);
					}
				}.bind(this)),
				refreshAll: d(function () {
					cb.clearAll();
					if (refresh()) result.emit('change');
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
		}, { length: 2, refCounter: true, dispose: invokeDispose }),

		sorted: d(function (compareFn) {
			var result, listener, disposed, refresh;
			(value(this) && callable(compareFn));
			result = ReadOnly.from(this);
			sort.call(result, compareFn);
			refresh = function () {
				var changed, tmp = aFrom(this).sort(compareFn);
				if (result.length !== tmp.length) {
					changed = true;
					result.length = tmp.length;
				}
				forEach.call(tmp, function (val, i) {
					if (!hasOwnProperty.call(result, i) || !eq(result[i], val)) {
						changed = true;
						result[i] = val;
					}
				});
				return changed;
			}.bind(this);
			this.on('change', listener = function (type, arg1, arg2) {
				var i;
				if ((type === 'reverse') || (type === 'sort')) return;
				if ((type === 'pop') || (type === 'shift')) {
					i = eIndexOf.call(result, arg1);
					result.emit('change', 'splice', [i, 1], splice.call(result, i, 1));
				} else if ((type === 'push') || (type === 'unshift')) {
					push.apply(result, arg1);
					sort.call(result, compareFn);
					result.emit('change');
				} else if (type === 'splice') {
					remove.apply(result, arg2);
					push.apply(result, slice.call(arg1, 2));
					sort.call(result, compareFn);
					result.emit('change');
				} else if (type === 'index') {
					if (arguments.length > 2) {
						result[eIndexOf.call(result, arg2)] = this[arg1];
					} else {
						push.call(result, this[arg1]);
					}
					result.emit('change');
				} else if (refresh()) {
					result.emit('change');
				}
			});
			defineProperties(result, {
				refresh: d(function (index) {
					if (refresh()) result.emit('change');
				}.bind(this)),
				refreshAll: d(function () {
					if (refresh()) result.emit('change');
				}),
				unref: d(function () {
					if (disposed) return;
					this.sorted.clearRef(compareFn);
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
