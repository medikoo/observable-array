'use strict';

var isSubclassable = require('es5-ext/array/_is-subclassable')
  , aFrom          = require('es5-ext/array/from')
  , isCopy         = require('es5-ext/array/#/is-copy')
  , validFunction  = require('es5-ext/function/valid-function')
  , toInt          = require('es5-ext/number/to-int')
  , mixin          = require('es5-ext/object/mixin-prototypes')
  , setPrototypeOf = require('es5-ext/object/set-prototype-of')
  , d              = require('d/d')
  , ee             = require('event-emitter')
  , memoize        = require('memoizee/lib/regular')

  , getPrototypeOf = Object.getPrototypeOf
  , concat, arrSplice;

require('memoizee/lib/ext/ref-counter');
require('memoizee/lib/ext/resolvers');
require('memoizee/lib/ext/dispose');

if (!isSubclassable) {
	concat = require('es5-ext/array/#/concat');
	arrSplice = require('es5-ext/array/#/splice');
}

module.exports = memoize(function (Constructor) {
	var Observable, pop, push, reverse, shift, sort, splice, unshift;

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
		})
	}));

	if (isSubclassable) {
		Object.defineProperty(Observable.prototype, 'concat', d(concat));
	}

	return Observable;
});
