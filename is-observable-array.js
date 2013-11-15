'use strict';

var isObservable = require('observable-value/is-observable')

  , isArray = Array.isArray;

module.exports = function (value) {
	return (isArray(value) && isObservable(value));
};
