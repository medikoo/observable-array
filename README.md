# observable-array
## Configure observable arrays

### Installation

	$ npm install observable-array

To port it to Browser or any other (non CJS) environment, use your favorite CJS bundler. No favorite yet? Try: [Browserify](http://browserify.org/), [Webmake](https://github.com/medikoo/modules-webmake) or [Webpack](http://webpack.github.io/)

### Usage

```javascript
var ObservableArray = require('observable-array');

var oArr = ObservableArray('raz', 'dwa');

oArr.on('change', function (event) {
  console.log("Change: " + event.type);
});

oArr.pop();                      // Change: pop
oArr.push('trzy');               // Change: push
oArr.push();                     // Nothing emitted, as array was not affected
oArr.reverse();                  // Change: reverse
oArr.shift();                    // Change: shift
oArr.sort();                     // Change: sort
oArr.splice(0, 0, 'foo', 'bar'); // Change: splice
oArr.unshift('before');          // Change: unshift

oArr = ObservableArray(1, 2, 3, 4, 5, 6);
var filtered = oArr.filter(function (num) { return num % 2; }); // [1, 3, 5]

filtered.on('change', function (event) {
  console.log("Change:" + event.type);
});
oArr.push(7); // Change: push (filtered == [1, 3, 5, 7])
oArr.shift(); // Change: shift (filtered == [3, 5, 7])

var mapped = oArr.map(function (num) { return num * 2; }); // [4, 6, 8, 10, 12, 14]

mapped.on('change', function (event) {
  console.log("Change:" + event.type);
});
oArr.push(8); // Change: push (mapped == [4, 6, 8, 10, 12, 14, 16])
oArr.shift(); // Change: shift (mapped == [6, 8, 10, 12, 14, 16])
```

## Tests [![Build Status](https://travis-ci.org/medikoo/observable-array.png)](https://travis-ci.org/medikoo/observable-array)

	$ npm test
