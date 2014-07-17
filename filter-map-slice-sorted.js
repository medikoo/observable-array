'use strict';

var aFrom                  = require('es5-ext/array/from')
  , eIndexOf               = require('es5-ext/array/#/e-index-of')
  , isCopy                 = require('es5-ext/array/#/is-copy')
  , remove                 = require('es5-ext/array/#/remove')
  , invoke                 = require('es5-ext/function/invoke')
  , validFunction          = require('es5-ext/function/valid-function')
  , toInteger              = require('es5-ext/number/to-integer')
  , eq                     = require('es5-ext/object/eq')
  , callable               = require('es5-ext/object/valid-callable')
  , value                  = require('es5-ext/object/valid-value')
  , d                      = require('d')
  , memoize                = require('memoizee/plain')
  , memoizeMethods         = require('memoizee/methods-plain')
  , getNormalizer          = require('memoizee/normalizers/get-fixed')
  , getNormalizer1         = require('memoizee/normalizers/get-1')
  , getPrimitiveNormalizer = require('memoizee/normalizers/get-primitive-fixed')
  , createReadOnly         = require('./create-read-only')
  , validObservableArray   = require('./valid-observable-array')

  , filter = Array.prototype.filter, forEach = Array.prototype.forEach
  , map = Array.prototype.map, pop = Array.prototype.pop
  , push = Array.prototype.push, reverse = Array.prototype.reverse
  , shift = Array.prototype.shift, slice = Array.prototype.slice
  , sort = Array.prototype.sort, splice = Array.prototype.splice
  , unshift = Array.prototype.unshift, bind = Function.prototype.bind
  , max = Math.max, defineProperties = Object.defineProperties
  , hasOwnProperty = Object.prototype.hasOwnProperty
  , invokeDispose = invoke('_dispose');

require('memoizee/ext/ref-counter');
require('memoizee/ext/dispose');

module.exports = memoize(function (ObservableArray) {
	var ReadOnly;

	validFunction(ObservableArray);
	validObservableArray(ObservableArray.prototype);
	ReadOnly = createReadOnly(ObservableArray);

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
				this.on('change', listener = function (event) {
					var type = event.type;
					if (type === 'pop') {
						pop.call(result);
						result.emit('change', event);
					} else if (type === 'push') {
						push.apply(result, event.values);
						result.emit('change', event);
					} else if (type === 'reverse') {
						reverse.call(result);
						result.emit('change', event);
					} else if (type === 'shift') {
						shift.call(result);
						result.emit('change', event);
					} else if (type === 'sort') {
						sort.call(result, event.compareFn);
						result.emit('change', event);
					} else if (type === 'splice') {
						splice.apply(result, event.arguments);
						result.emit('change', event);
					} else if (type === 'unshift') {
						unshift.apply(result, event.values);
						result.emit('change', event);
					} else if (type === 'set') {
						result[event.index] = this[event.index];
						result.emit('change', event);
					} else {
						rEnd = this.length;
						refresh();
						result.emit('change', event);
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
				this.on('change', listener = function (event) {
					var type = event.type, values, index, newEvent;
					if (type === 'pop') {
						if ((rEnd === (this.length + 1)) && (rStart !== rEnd)) {
							pop.call(result);
							recalculate();
							result.emit('change', event);
						} else {
							recalculate();
						}
					} else if (type === 'push') {
						recalculate();
						values = event.values;
						if ((rEnd > (this.length - values.length)) && (rStart !== rEnd)) {
							if (rEnd !== this.length) {
								values = slice.call(values, 0,
									values.length - (this.length - rEnd));
							}
							push.apply(result, values);
							result.emit('change', {
								type: 'push',
								values: values
							});
						}
					} else if (type === 'set') {
						index = event.index;
						if ((rStart > index) || (rEnd <= index)) return;
						result[index - rStart] = this[index];
						newEvent = {
							type: 'set',
							index: index - rStart
						};
						if (event.hasOwnProperty('oldValue')) {
							newEvent.oldValue = event.oldValue;
						}
						result.emit('change', newEvent);
					} else {
						recalculate();
						if (refresh()) result.emit('change', {});
					}
				});
			}
			defineProperties(result, {
				unref: d(function () {
					if (disposed) return;
					this.slice.deleteRef(start, end);
				}.bind(this)),
				_dispose: d(function () {
					this.off('change', listener);
					disposed = true;
				}.bind(this))
			});
			return result;
		}, { resolvers: [toInteger, function (val) {
			return (val === undefined) ? Infinity : toInteger(val);
		}], refCounter: true, dispose: invokeDispose, normalizer: getPrimitiveNormalizer(2) }),

		filter: d(function (callbackFn/*, thisArg*/) {
			var result, listener, refresh, thisArg, cb, disposed;
			(value(this) && callable(callbackFn));
			thisArg = arguments[1];
			cb = memoize(bind.call(callbackFn, thisArg), { normalizer: getNormalizer1() });
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
			this.on('change', listener = function (event) {
				var i, tmp, type = event.type, values;
				if (type === 'pop') {
					if (!cb(event.value)) return;
					pop.call(result);
					result.emit('change', event);
				} else if (type === 'push') {
					values = event.values;
					i = this.length - values.length;
					values = filter.call(values, function (val) {
						return cb(val, i++, this);
					}, this);
					if (!values.length) return;
					push.apply(result, values);
					result.emit('change', {
						type: 'push',
						values: values
					});
				} else if (type === 'reverse') {
					if (result.length <= 1) return;
					tmp = aFrom(result);
					reverse.call(result);
					if (!isCopy.call(result, tmp)) result.emit('change', event);
				} else if (type === 'shift') {
					if (!cb(event.value)) return;
					shift.call(result);
					result.emit('change', event);
				} else if (type === 'sort') {
					if (result.length <= 1) return;
					tmp = aFrom(result);
					sort.call(result, event.compareFn);
					if (!isCopy.call(result, tmp)) result.emit('change', event);
				} else if (type === 'splice') {
					if (refresh()) result.emit('change', {});
				} else if (type === 'unshift') {
					values = event.values;
					values = filter.call(values, function (val, i) {
						return cb(val, i, this);
					}, this);
					if (!values.length) return;
					unshift.apply(result, values);
					result.emit('change', {
						type: 'unshift',
						values: values
					});
				} else if (type === 'set') {
					if (!cb(this[event.index], event.index, this)) {
						if (!event.hasOwnProperty('oldValue')) return;
						if (!cb(event.oldValue)) return;
					}
					if (refresh()) result.emit('change', {});
				} else if (refresh()) {
					result.emit('change', {});
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
						result.emit('change', {});
					}
				}.bind(this)),
				refreshAll: d(function () {
					cb.clear();
					if (refresh()) result.emit('change', {});
				}),
				unref: d(function () {
					if (disposed) return;
					this.filter.deleteRef(callbackFn, thisArg);
				}.bind(this)),
				_dispose: d(function () {
					this.off('change', listener);
					disposed = true;
				}.bind(this))
			});
			return result;
		}, { length: 2, refCounter: true, dispose: invokeDispose, getNormalizer: getNormalizer }),

		map: d(function (callbackFn/*, thisArg*/) {
			var result, listener, refresh, thisArg, disposed, cb;
			(value(this) && callable(callbackFn));
			thisArg = arguments[1];
			cb = memoize(bind.call(callbackFn, thisArg), { normalizer: getNormalizer1() });
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
			this.on('change', listener = function (event) {
				var i, value, old, type = event.type, values, args, removed, newEvent
				  , tmp;
				if (type === 'pop') {
					result.emit('change', { type: 'pop', value: pop.call(result) });
				} else if (type === 'push') {
					values = event.values;
					i = this.length - values.length;
					values = map.call(values, function (val) {
						return cb(val, i++, this);
					}, this);
					push.apply(result, values);
					result.emit('change', {
						type: 'push',
						values: values
					});
				} else if (type === 'reverse') {
					tmp = aFrom(result);
					reverse.call(result);
					if (!isCopy.call(result, tmp)) result.emit('change', event);
				} else if (type === 'shift') {
					result.emit('change', { type: 'shift', value: shift.call(result) });
				} else if (type === 'splice') {
					i = toInteger(event.arguments[0]);
					if (i < 0) i = this.length - i;
					args = map.call(event.arguments, function (val, j) {
						if (j < 2) return val;
						return cb(val, i++, this);
					}, this);
					removed = splice.apply(result, args);
					if (((event.arguments.length <= 2) && removed.length) ||
							!isCopy.call(event.arguments.slice(2), removed)) {
						result.emit('change', {
							type: 'splice',
							arguments: args,
							removed: removed
						});
					}
				} else if (type === 'unshift') {
					values = map.call(event.values, function (val, i) {
						return cb(val, i, this);
					}, this);
					unshift.apply(result, values);
					result.emit('change', { type: 'unshift', values: values });
				} else if (type === 'set') {
					value = cb(this[event.index], event.index, this);
					if (event.hasOwnProperty('oldValue')) {
						old = result[event.index];
						if (value === old) return;
					}
					result[event.index] = value;
					newEvent = { type: 'set', index: event.index };
					if (event.hasOwnProperty('oldValue')) newEvent.oldValue = old;
					result.emit('change', newEvent);
				} else if (refresh()) {
					result.emit('change', {});
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
						result.emit('change', { type: 'set', index: index, oldValue: val });
					}
				}.bind(this)),
				refreshAll: d(function () {
					cb.clear();
					if (refresh()) result.emit('change', {});
				}),
				unref: d(function () {
					if (disposed) return;
					this.map.deleteRef(callbackFn, thisArg);
				}.bind(this)),
				_dispose: d(function () {
					this.off('change', listener);
					disposed = true;
				}.bind(this))
			});
			return result;
		}, { length: 2, refCounter: true, dispose: invokeDispose, getNormalizer: getNormalizer }),

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
			this.on('change', listener = function (event) {
				var i, type = event.type;
				if ((type === 'reverse') || (type === 'sort')) return;
				if ((type === 'pop') || (type === 'shift')) {
					i = eIndexOf.call(result, event.value);
					result.emit('change', { type: 'splice', arguments: [i, 1],
						removed: splice.call(result, i, 1) });
				} else if ((type === 'push') || (type === 'unshift')) {
					push.apply(result, event.values);
					sort.call(result, compareFn);
					result.emit('change', {});
				} else if (type === 'splice') {
					remove.apply(result, event.removed);
					push.apply(result, slice.call(event.arguments, 2));
					sort.call(result, compareFn);
					result.emit('change', {});
				} else if (type === 'set') {
					if (event.hasOwnProperty('oldValue')) {
						result[eIndexOf.call(result, event.oldValue)] = this[event.index];
					} else {
						push.call(result, this[event.index]);
					}
					if (refresh()) result.emit('change', {});
				} else if (refresh()) {
					result.emit('change', {});
				}
			});
			defineProperties(result, {
				refresh: d(function (index) {
					if (refresh()) result.emit('change', {});
				}.bind(this)),
				refreshAll: d(function () {
					if (refresh()) result.emit('change', {});
				}),
				unref: d(function () {
					if (disposed) return;
					this.sorted.deleteRef(compareFn);
				}.bind(this)),
				_dispose: d(function () {
					this.off('change', listener);
					disposed = true;
				}.bind(this))
			});
			return result;
		}, { length: 2, refCounter: true, dispose: invokeDispose, getNormalizer: getNormalizer })
	}));

	return ObservableArray;
}, { normalizer: getNormalizer1() });
