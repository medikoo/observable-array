'use strict';

var isArray = Array.isArray;

module.exports = function (t, a) {
	var ObservableArray = t(Array)
	  , arr = new ObservableArray('foo', 'bar', 23)
	  , evented = 0, x = {};
	a(isArray(arr), true, "Is array");
	a(arr instanceof ObservableArray, true, "Subclassed");

	a.deep(arr, ['foo', 'bar', 23], "Constructor");

	arr.on('change', function () { ++evented; });

	arr.pop();
	a.deep(arr, ['foo', 'bar'], "Pop: value");
	a(evented, 1, "Pop: event");

	arr.pop();
	arr.pop();
	a.deep(arr, [], "Pop: clear");
	a(evented, 3, "Pop: event");

	arr.pop();
	a(evented, 3, "Pop: on empty");

	arr.shift();
	a(evented, 3, "Shift: on empty");

	arr.reverse();
	a(evented, 3, "Revere: on empty");

	arr.push();
	a(evented, 3, "Push: empty");

	arr.push(x);
	a.deep(arr, [x], "Push: value");
	a(evented, 4, "Push: event");

	arr.reverse();
	a(evented, 4, "Reverse: one value");

	arr.push(x);
	a(evented, 5, "Push: another");
	arr.reverse();
	a(evented, 5, "Reverse: same layout");

	arr.push(34);
	a(evented, 6, "Push: another #2");
	arr.reverse();
	a(evented, 7, "Reverse: diff");
	a.deep(arr, [34, x, x], "Reverse: content");

	arr.shift();
	a.deep(arr, [x, x], "Shift: content");
	a(evented, 8, "Shift: event");

	arr.sort();
	a(evented, 8, "Sort: no change");

	arr.pop();
	arr.pop();

	arr.push('wed');
	arr.push('abc');

	arr.set(arr.length, 'raz');
	a(evented, 13, "Events");

	arr.sort();
	a.deep(arr, ['abc', 'raz', 'wed'], "Sort: content");
	a(evented, 14, "Sort: event");

	arr.splice();
	a(evented, 14, "Splice: no data");
	arr.splice(12);
	a(evented, 14, "Splice: too far");
	arr.splice(1, 0);
	a(evented, 14, "Splice: no delete");
	arr.splice(1, 0, 'foo');
	a.deep(arr, ['abc', 'foo', 'raz', 'wed'], "Sort: content");
	a(evented, 15, "Splice: event");

	arr.unshift();
	a(evented, 15, "Unshift: no data");

	arr.unshift('elo', 'bar');
	a.deep(arr, ['elo', 'bar', 'abc', 'foo', 'raz', 'wed'], "Unshift: content");
	a(evented, 16, "Unshift: event");
};
