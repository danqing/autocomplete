# Autocomplete

This is a light-weight JavaScript widget that provides autocomplete for user inputs that gets its data from remote sources. It has the following nice features:

* Handles fetching results via HTTP.
* Supports keyboard navigation.
* Customizable to support different data format.
* No dependencies and small in size.

## Install

Get it from npm, or simply download the `ac.js` file and put it into your project.

```
npm install remote-ac --save
```

## Usage

```js
var AC = require('remote-ac');
var ac = new AC(input, urlBuilderFn, resultFn, rowFn, triggerFn);
```

where:

* `input` is the text field that holds the user input to autocomplete.
* `urlBuilderFn` is the function that takes the user input string and returns the URL to retrieve the autocomplete results. It is assumed that it is a GET request.
* `resultFn` is the function that processes the returned results, in case you have some custom format. It takes the raw HTTP response, and returns a list of autocomplete results. If the response is already a list of results, you do not need to specify this function.
* `rowFn` is the function that takes the data of a row to render the row in the DOM. If it is not provided, autocomplete will generate the rows automatically.
* `triggerFn` is the function called when the user clicks on an autocomplete row. The result associated with the row will be passed in as the parameter.

## License

MIT.
