'use strict';

module.exports = exports = function (t, a) {
	exports.tests(t(require('../create')(Array)), a);
};

exports.tests = function (ObservableArray, a) {
	var arr, evented = 0, x = {}, y, z, w, arr2, listener;

	arr = new ObservableArray('elo', 'bar', 'abc', 'foo', 'raz', 'wed');
	// Slice
	evented = 0;
	arr2 = arr.slice(1, 3);
	arr.off('change', listener = function () { ++evented; });
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

	arr2.on('change', function (e) {
		a.deep(e.arguments, [2, 3], "Splice arguments");
	});
	arr.splice(2, 3);

	a.h1("Sorted");
	x = { val: 32 };
	y = { val: 23 };
	z = { val: 54 };
	arr = new ObservableArray(x, y, z);
	evented = 0;

	arr2 = arr.sorted(function (a, b) { return a.val - b.val; });
	arr2.on('change', listener);
	a.deep(arr2, [y, x, z]);

	a.h2("Push");
	w =  { val: 50 };
	arr.push(w);
	a.deep(arr2, [y, x, w, z]);
	a(evented, 1, "Event");

	a.h2("Shift");
	arr.shift();
	a.deep(arr2, [y, w, z]);
	a(evented, 2, "Event");

	a.h2("Inner update");
	y.val = 100;
	a.deep(arr2, [y, w, z]);
	a(evented, 2, "Event");

	a.h2("Refresh");
	arr2.refresh(0);
	a.deep(arr2, [w, z, y]);
	a(evented, 3, "Event");

	a.h2("Refresh all");
	z.val = 320;
	arr2.refreshAll();
	a.deep(arr2, [w, y, z]);
	a(evented, 4, "Event");
};
