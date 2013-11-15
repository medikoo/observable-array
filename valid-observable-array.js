'use strict';

var isObservable = require('./is-observable-array');

module.exports = function (value) {
	if (isObservable(value)) return value;
	throw new TypeError(value + " is not an observable array");
};
