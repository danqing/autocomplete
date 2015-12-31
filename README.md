# Autocomplete

This is a light-weight JavaScript widget that provides autocomplete for user inputs that gets its data from remote sources.

## Install

Get it from npm, or simply download the `ac.js` file and put it into your project.

```
npm install remote-ac --save
```

## Usage

```js
var AC = require('remote-ac');

var input = document.getElementById('some-input');
var ac = new AC(input, urlBuilderFn, resultFn, triggerFn);
```

## License

MIT.
