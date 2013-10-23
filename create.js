'use strict';

var isSubclassable = require('es5-ext/array/_is-subclassable')
  , aFrom          = require('es5-ext/array/from')
  , isCopy         = require('es5-ext/array/#/is-copy')
  , validFunction  = require('es5-ext/function/valid-function')
  , toInt          = require('es5-ext/number/to-int')
  , eq             = require('es5-ext/object/eq')
  , mixin          = require('es5-ext/object/mixin-prototypes')
  , setPrototypeOf = require('es5-ext/object/set-prototype-of')
  , callable       = require('es5-ext/object/valid-callable')
  , value          = require('es5-ext/object/valid-value')
  , d              = require('d/d')
  , ee             = require('event-emitter')
  , memoize        = require('memoizee/lib/regular')
  , createReadOnly = require('./create-read-only')

  , bind = Function.prototype.bind, max = Math.max
  , defineProperty = Object.defineProperty
  , getPrototypeOf = Object.getPrototypeOf
  , hasOwnProperty = Object.prototype.hasOwnProperty
  , concat, arrSplice;

if (!isSubclassable) {
	concat = require('es5-ext/array/#/concat');
	arrSplice = require('es5-ext/array/#/splice');
}

module.exports = memoize(function (Constructor) {
	var Observable, filter, map, pop, push, reverse, shift, sort, splice, unshift
	  , ReadOnly;

	validFunction(Constructor);
	Observable = function (len) {
		var arr, proto = (this instanceof Observable) ?
				getPrototypeOf(this) : Observable.prototype;
		arr = Array.apply(null, arguments);
		if (setPrototypeOf) setPrototypeOf(arr, proto);
		else mixin(arr, proto);
		return arr;
	};
	if (setPrototypeOf) setPrototypeOf(Observable, Constructor);

	filter = Constructor.prototype.filter;
	map = Constructor.prototype.map;
	pop = Constructor.prototype.pop;
	push = Constructor.prototype.push;
	reverse = Constructor.prototype.reverse;
	shift = Constructor.prototype.shift;
	sort = Constructor.prototype.sort;
	splice = (arrSplice && (Constructor === Array)) ?
			arrSplice : Constructor.prototype.splice;
	unshift = Constructor.prototype.unshift;

	Observable.prototype = ee(Object.create(Array.prototype, {
		constructor: d(Observable),
		pop: d(function () {
			var element;
			if (!this.length) return;
			element = pop.call(this);
			this.emit('change');
			return element;
		}),
		push: d(function (item/*, …items*/) {
			var result;
			if (!arguments.length) return this.length;
			result = push.apply(this, arguments);
			this.emit('change');
			return result;
		}),
		reverse: d(function () {
			var tmp;
			if (this.length <= 1) return this;
			tmp = aFrom(this);
			reverse.call(this);
			if (!isCopy.call(this, tmp)) this.emit('change');
			return this;
		}),
		shift: d(function () {
			var element;
			if (!this.length) return;
			element = shift.call(this);
			this.emit('change');
			return element;
		}),
		sort: d(function (compareFn) {
			var tmp;
			if (this.length <= 1) return this;
			tmp = aFrom(this);
			sort.call(this, compareFn);
			if (!isCopy.call(this, tmp)) this.emit('change');
			return this;
		}),
		splice: d(function (start, deleteCount/*, …items*/) {
			var tmp, result, l = arguments.length;
			if (!l) return [];
			if (l <= 2) {
				if (toInt(start) >= this.length) return [];
				if (toInt(deleteCount) <= 0) return [];
			} else if (toInt(start) < this.length) {
				tmp = aFrom(this);
			}
			result = splice.apply(this, arguments);
			if (!tmp || !isCopy.call(this, tmp)) this.emit('change');
			return result;
		}),
		unshift: d(function (item/*, …items*/) {
			var result;
			if (!arguments.length) return this.length;
			result = unshift.apply(this, arguments);
			this.emit('change');
			return result;
		}),

		slice: d(function (start, end) {
			var result, refresh, listener;
			start = toInt(start);
			end = (end === undefined) ? Infinity : toInt(end);
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
			result.once('unlink', this.off.bind(this, 'change', listener));
			return result;
		}),
		filter: d(function (callbackFn/*, thisArg*/) {
			var result, listener;
			(value(this) && callable(callbackFn));
			callbackFn = memoize(bind.call(callbackFn, arguments[1]), { length: 1 });
			result = ReadOnly.apply(null, filter.call(this, callbackFn));
			this.on('change', listener = function () {
				var nu = filter.call(this, callbackFn), changed;
				if (nu.length !== result.length) {
					changed = true;
					result.length = nu.length;
				}
				nu.forEach(function (val, i) {
					if (eq(result[i], val)) return;
					changed = true;
					result[i] = val;
				});
				if (changed) result.emit('change');
			}.bind(this));
			result.once('unlink', this.off.bind(this, 'change', listener));
			defineProperty(result, 'refresh', d(function (index) {
				var filtered;
				index = index >>> 0;
				if (!this.hasOwnProperty(index)) return;
				filtered = Boolean(callbackFn(this[index]));
				callbackFn.clear(this[index]);
				if (Boolean(callbackFn(this[index])) !== filtered) listener();
			}.bind(this)));
			defineProperty(result, 'refreshAll', d(function () {
				callbackFn.clearAll();
				listener();
			}));
			return result;
		}),
		map: d(function (callbackFn/*, thisArg*/) {
			var result, listener;
			(value(this) && callable(callbackFn));
			callbackFn = memoize(bind.call(callbackFn, arguments[1]), { length: 1 });
			result = ReadOnly.apply(null, map.call(this, callbackFn));
			this.on('change', listener = function () {
				var nu = map.call(this, callbackFn), changed;
				if (nu.length !== result.length) {
					changed = true;
					result.length = nu.length;
				}
				nu.forEach(function (val, i) {
					if (eq(result[i], val)) return;
					changed = true;
					result[i] = val;
				});
				if (changed) result.emit('change');
			}.bind(this));
			result.once('unlink', this.off.bind(this, 'change', listener));
			defineProperty(result, 'refresh', d(function (index) {
				var val;
				index = index >>> 0;
				if (!this.hasOwnProperty(index)) return;
				val = callbackFn(this[index]);
				callbackFn.clear(this[index]);
				if (!eq(callbackFn(this[index]), val)) listener();
			}.bind(this)));
			defineProperty(result, 'refreshAll', d(function () {
				callbackFn.clearAll();
				listener();
			}));
			return result;
		})
	}));

	if (isSubclassable) {
		Object.defineProperty(Observable.prototype, 'concat', d(concat));
	}

	ReadOnly = createReadOnly(Observable);
	return Observable;
});
