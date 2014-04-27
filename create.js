'use strict';

var isExtensible       = require('es5-ext/array/_is-extensible')
  , aFrom              = require('es5-ext/array/from')
  , validArray         = require('es5-ext/array/valid-array')
  , isCopy             = require('es5-ext/array/#/is-copy')
  , validFunction      = require('es5-ext/function/valid-function')
  , toInteger          = require('es5-ext/number/to-integer')
  , eq                 = require('es5-ext/object/eq')
  , mixin              = require('es5-ext/object/mixin-prototypes')
  , setPrototypeOf     = require('es5-ext/object/set-prototype-of')
  , d                  = require('d')
  , isObservableSymbol = require('observable-value/symbol-is-observable')
  , ee                 = require('event-emitter')
  , memoize            = require('memoizee/plain')

  , slice = Array.prototype.slice
  , defineProperty = Object.defineProperty
  , defineProperties = Object.defineProperties
  , getPrototypeOf = Object.getPrototypeOf
  , concat, arrSplice;

if (!isExtensible) {
	concat = require('es5-ext/array/#/concat');
	arrSplice = require('es5-ext/array/#/splice');
}

module.exports = memoize(function (Constructor) {
	var Observable, pop, push, reverse, shift, sort, splice, unshift;

	validFunction(Constructor);
	validArray(Constructor.prototype);

	Observable = function (len) {
		var arr, proto = (this instanceof Observable) ?
				getPrototypeOf(this) : Observable.prototype;
		arr = Array.apply(null, arguments);
		if (setPrototypeOf) setPrototypeOf(arr, proto);
		else mixin(arr, proto);
		return arr;
	};
	if (setPrototypeOf) setPrototypeOf(Observable, Constructor);
	if (!Observable.from) defineProperty(Observable, 'from', d(aFrom));

	pop = Constructor.prototype.pop;
	push = Constructor.prototype.push;
	reverse = Constructor.prototype.reverse;
	shift = Constructor.prototype.shift;
	sort = Constructor.prototype.sort;
	splice = (arrSplice && (Constructor === Array)) ?
			arrSplice : Constructor.prototype.splice;
	unshift = Constructor.prototype.unshift;

	Observable.prototype = [];
	if (setPrototypeOf) {
		setPrototypeOf(Observable.prototype, Constructor.prototype);
	} else {
		mixin(Observable.prototype, Constructor.prototype);
	}
	defineProperties(ee(Observable.prototype), {
		constructor: d(Observable),
		pop: d(function () {
			var element;
			if (!this.length) return;
			element = pop.call(this);
			this.emit('change', {
				type: 'pop',
				value: element
			});
			return element;
		}),
		push: d(function (item/*, …items*/) {
			var result;
			if (!arguments.length) return this.length;
			result = push.apply(this, arguments);
			this.emit('change', {
				type: 'push',
				values: arguments
			});
			return result;
		}),
		reverse: d(function () {
			var tmp;
			if (this.length <= 1) return this;
			tmp = aFrom(this);
			reverse.call(this);
			if (!isCopy.call(this, tmp)) this.emit('change', { type: 'reverse' });
			return this;
		}),
		shift: d(function () {
			var element;
			if (!this.length) return;
			element = shift.call(this);
			this.emit('change', {
				type: 'shift',
				value: element
			});
			return element;
		}),
		sort: d(function (compareFn) {
			var tmp;
			if (this.length <= 1) return this;
			tmp = aFrom(this);
			sort.call(this, compareFn);
			if (!isCopy.call(this, tmp)) {
				this.emit('change', {
					type: 'sort',
					compareFn: compareFn
				});
			}
			return this;
		}),
		splice: d(function (start, deleteCount/*, …items*/) {
			var result, l = arguments.length, items;
			if (!l) return [];
			if (l <= 2) {
				if (toInteger(start) >= this.length) return [];
				if (toInteger(deleteCount) <= 0) return [];
			} else {
				items = slice.call(arguments, 2);
			}
			result = splice.apply(this, arguments);
			if ((!items && result.length) || !isCopy.call(items, result)) {
				this.emit('change', {
					type: 'splice',
					arguments: arguments,
					removed: result
				});
			}
			return result;
		}),
		unshift: d(function (item/*, …items*/) {
			var result;
			if (!arguments.length) return this.length;
			result = unshift.apply(this, arguments);
			this.emit('change', {
				type: 'unshift',
				values: arguments
			});
			return result;
		}),
		set: d(function (index, value) {
			var had, old, event;
			index = index >>> 0;
			if (this.hasOwnProperty(index)) {
				had = true;
				old = this[index];
				if (eq(old, value)) return;
			}
			this[index] = value;
			event = {
				type: 'set',
				index: index
			};
			if (had) event.oldValue = old;
			this.emit('change', event);
		})
	});
	defineProperty(Observable.prototype, isObservableSymbol, d('', true));

	if (isExtensible) defineProperty(Observable.prototype, 'concat', d(concat));

	return Observable;
}, { normalizer: require('memoizee/normalizers/get-1')() });
