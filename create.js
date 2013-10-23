'use strict';

var isSubclassable = require('es5-ext/array/_is-subclassable')
  , aFrom          = require('es5-ext/array/from')
  , isCopy         = require('es5-ext/array/#/is-copy')
  , invoke         = require('es5-ext/function/invoke')
  , validFunction  = require('es5-ext/function/valid-function')
  , toInt          = require('es5-ext/number/to-int')
  , assign         = require('es5-ext/object/assign')
  , eq             = require('es5-ext/object/eq')
  , mixin          = require('es5-ext/object/mixin-prototypes')
  , setPrototypeOf = require('es5-ext/object/set-prototype-of')
  , callable       = require('es5-ext/object/valid-callable')
  , value          = require('es5-ext/object/valid-value')
  , d              = require('d/d')
  , lazy           = require('d/lazy')
  , ee             = require('event-emitter')
  , memoize        = require('memoizee/lib/regular')
  , createReadOnly = require('./create-read-only')

  , bind = Function.prototype.bind, max = Math.max
  , defineProperties = Object.defineProperties
  , getPrototypeOf = Object.getPrototypeOf
  , hasOwnProperty = Object.prototype.hasOwnProperty
  , invokeDispose = invoke('_dispose')
  , concat, arrSplice;

require('memoizee/lib/ext/ref-counter');
require('memoizee/lib/ext/resolvers');
require('memoizee/lib/ext/dispose');

if (!isSubclassable) {
	concat = require('es5-ext/array/#/concat');
	arrSplice = require('es5-ext/array/#/splice');
}

module.exports = memoize(function (Constructor) {
	var Observable, forEach, pop, push, reverse, shift, sort, splice, unshift
	  , ReadOnly, slice, filter, map;

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

	forEach = Constructor.prototype.forEach;
	pop = Constructor.prototype.pop;
	push = Constructor.prototype.push;
	reverse = Constructor.prototype.reverse;
	shift = Constructor.prototype.shift;
	sort = Constructor.prototype.sort;
	splice = (arrSplice && (Constructor === Array)) ?
			arrSplice : Constructor.prototype.splice;
	unshift = Constructor.prototype.unshift;

	slice = function (start, end) {
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
	};

	filter = function (callbackFn/*, thisArg*/) {
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
	};

	map = function (callbackFn/*, thisArg*/) {
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
	};

	Observable.prototype = ee(Object.create(Array.prototype, assign({
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
		})
	}, lazy({
		slice: d(function () {
			return memoize(slice.bind(this), { resolvers: [toInt,
				function (val) { return (val === undefined) ? Infinity : toInt(val); }],
				refCounter: true, dispose: invokeDispose });
		}),
		filter: d(function () {
			return memoize(filter.bind(this), { length: 2, refCounter: true,
				dispose: invokeDispose });
		}),
		map: d(function () {
			return memoize(map.bind(this), { length: 2, refCounter: true,
				dispose: invokeDispose });
		})
	}))));

	if (isSubclassable) {
		Object.defineProperty(Observable.prototype, 'concat', d(concat));
	}

	ReadOnly = createReadOnly(Observable);
	return Observable;
});
