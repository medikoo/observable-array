# observable-array

## Configure observable arrays

### Usage

```javascript
var ObservableArray = require('observable-array');

var oArr = ObservableArray('raz', 'dwa');

oArr.on('change', function () {
  console.log("Change emitted");
});

oArr.pop();                      // Change emitted
oArr.push('trzy');               // Change emitted
oArr.push();                     // Nothing emitted, as array was not affected
oArr.reverse();                  // Change emitted
oArr.shift();                    // Change emitted
oArr.sort();                     // Change emitted
oArr.splice(0, 0, 'foo', 'bar'); // Change emitted
oArr.unshift('before');          // Change emitted

oArr = ObservableArray(1, 2, 3, 4, 5, 6);
var filtered = oArr.filter(function (num) { return num % 2; }); // [1, 3, 5]

filtered.on('change', function () {
  console.log("Filter change emitted");
});
oArr.push(7); // Filter change emitted (filtered == [1, 3, 5, 7])
oArr.shift(); // Filter change emitted (filtered == [3, 5, 7])

var mapped = oArr.map(function (num) { return num * 2; }); // [4, 6, 8, 10, 12, 14]

mapped.on('change', function () {
  console.log("Map change emitted");
});
oArr.push(8); // Map change emitted (mapped == [4, 6, 8, 10, 12, 14, 16])
oArr.shift(); // Map change emitted (mapped == [6, 8, 10, 12, 14, 16])
```

### Installation
#### NPM

In your project path:

	$ npm install observable-array

##### Browser

You can easily bundle _observable-array_ for browser with [modules-webmake](https://github.com/medikoo/modules-webmake)

## Tests [![Build Status](https://travis-ci.org/medikoo/observable-array.png)](https://travis-ci.org/medikoo/observable-array)

	$ npm test
