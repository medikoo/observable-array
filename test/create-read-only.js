'use strict';

module.exports = function (t, a) {
	var ReadOnlyArray = t(Array), arr = new ReadOnlyArray('foo', 'bar');

	a(Array.isArray(arr), true, "Array");
	a(arr instanceof ReadOnlyArray, true, "Subclass");
	a.deep(arr, ['foo', 'bar'], "Content");

	a.throws(function () { arr.pop('elo'); }, RangeError, "Pop");
	a.throws(function () { arr.push('elo'); }, RangeError, "Push");
	a.throws(function () { arr.reverse(); }, RangeError, "Reverse");
	a.throws(function () { arr.shift(); }, RangeError, "Shift");
	a.throws(function () { arr.sort(); }, RangeError, "Sort");
	a.throws(function () { arr.splice(0, 2); }, RangeError, "Splice");
	a.throws(function () { arr.unshift(0, 2); }, RangeError, "Unshift");

	a.deep(arr, ['foo', 'bar'], "Content unaltered");
};
