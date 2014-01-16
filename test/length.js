'use strict';

module.exports = exports = function (t, a) {
	exports.tests(t(require('../create')(Array)), a);
};

exports.tests = function (ObservableArray, a) {
	var arr, len;

	arr = new ObservableArray('elo', 'bar', 'abc', 'foo', 'raz', 'wed');

	len = arr._length;
	a(len.value, 6, "Initial");

	arr.push('foo', 'bar');
	a(len.value, 8, "Push");

	arr.shift();
	a(len.value, 7, "Shift");
};
