'use strict';

var isArray = Array.isArray;

module.exports = function (t, a) {
	var ObservableArray = t(Array)
	  , arr = new ObservableArray('foo', 'bar', 23)
	  , evented = 0, x = {}, y, z, w, arr2, listener;
	a(isArray(arr), true, "Is array");
	a(arr instanceof ObservableArray, true, "Subclassed");

	a.deep(arr, ['foo', 'bar', 23], "Constructor");

	arr.on('change', listener = function () { ++evented; });

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
	arr.push('raz');
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

	// Slice
	evented = 0;
	arr2 = arr.slice(1, 3);
	arr.off('change', listener);
	arr2.on('change', listener);

	a.deep(arr2, ['bar', 'abc'], "Slice");
	arr.push('mucha');
	a(evented, 0, "Slice: Outside of scope: Event");
	a.deep(arr2, ['bar', 'abc'], "Slice: Outside of scope: Content");
	arr.unshift('pre');
	a(evented, 1, "Slice: Within scope: Event");
	a.deep(arr2, ['elo', 'bar'], "Slice: Within scope: Content");

	// Filter
	x = { val: 12 };
	y = { val: 43 };
	z = { val: 54 };
	arr = new ObservableArray(x, y, z);
	evented = 0;

	arr2 = arr.filter(function (val) { return val.val % 2; });
	arr2.on('change', listener);

	a.deep(arr2, [y], "Filter");
	w = { val: 33 };
	arr.push(w);
	a.deep(arr2, [y, w], "Filter: Change");
	a(evented, 1, "Filter: event");
	arr.push(y);
	a.deep(arr2, [y, w, y], "Filter: Add again");
	a(evented, 2, "Filter: Add again: event");

	x.val = 11;
	a.deep(arr2, [y, w, y], "Filter: sub update");
	a(evented, 2, "Filter: sub update");

	arr2.refresh(0);
	a.deep(arr2, [x, y, w, y], "Filter: refresh");
	a(evented, 3, "Filter: refresh");

	arr2.refresh(1);
	a(evented, 3, "Filter: refresh, no change");

	w.val = 20;
	arr2.refreshAll();
	a.deep(arr2, [x, y, y], "Filter: refresh all");
	a(evented, 4, "Filter: refresh all");

	// Map
	arr = new ObservableArray(x, y, z);
	evented = 0;

	arr2 = arr.map(function (val) { return val.val * 2; });
	arr2.on('change', listener);

	a.deep(arr2, [22, 86, 108], "Map");
	arr.push(w);
	a.deep(arr2, [22, 86, 108, 40], "Map: Change");
	a(evented, 1, "Map: event");

	y.val = 10;
	a.deep(arr2, [22, 86, 108, 40], "Map: sub update");
	a(evented, 1, "Map: sub update");

	arr2.refresh(1);
	a.deep(arr2, [22, 20, 108, 40], "Filter: refresh");
	a(evented, 2, "Filter: refresh");

	z.val = 32;
	arr2.refreshAll();
	a.deep(arr2, [22, 20, 64, 40], "Filter: refresh all");
	a(evented, 3, "Filter: refresh");
};
