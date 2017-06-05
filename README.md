# Autocomplete [![npm version](https://badge.fury.io/js/remote-ac.svg)](http://badge.fury.io/js/remote-ac)

This is a light-weight JavaScript widget that provides autocomplete for user inputs that gets its data from remote sources. It has the following nice features:

* Handles fetching results via HTTP.
* Supports keyboard navigation.
* Customizable to support different data format.
* No dependencies and small in size.

Demo: http://danqing.github.io/autocomplete/

## Install

Get it from npm, or simply download the `ac.js` file and put it into your project.

```
npm install remote-ac --save
```

## Usage

```js
var AC = require('remote-ac');
var ac = new AC(input, urlFn, requestFn, resultFn, rowFn, triggerFn, anchorEl);
```

where:

* `input` is the text field that holds the user input to autocomplete.
* `urlFn` is the function that takes the user input string and returns the URL to retrieve the autocomplete results. It is assumed that it is a GET request.
* `requestFn` is the function that allows full customization of a request behavior. It takes the user input string and should update `this.results` with the desired result and call `this.render()` to update the autocomplete. If this function is provided, both `urlFn` and `resultFn` will be ignored.
* `resultFn` is the function that processes the returned results, in case you have some custom format. It takes the raw HTTP response, and returns a list of autocomplete results. If the response is already a list of results, you do not need to specify this function.
* `rowFn` is the function that takes the data of a row to render the row in the DOM. If it is not provided, autocomplete will generate the rows automatically.
* `triggerFn` is the function called when the user clicks on an autocomplete row. The result associated with the row will be passed in as the parameter.
* `anchorEl` is the element to position the autocomplete against, in case you don't want it to be positioned below the input element.

If you would like to use the default row rendering function, you can have a primary text label and an optional secondary text label. The default keys to them are `title` and `subtitle`, i.e.:

```js
[{
  'title': 'Some Title Label',
  'subtitle': 'Some Subtitle Label',
  'other_key': '...'
}, {
  ...
}]
```

If your payload has some other keys, you can change the label keys with the following:

```js
var ac = new AC(...);
ac.primaryTextKey = 'your_key';
ac.secondaryTextKey = 'your_secondary_key';
```

Full example (find it in the gh-pages branch):

```js
var service = new google.maps.places.PlacesService(...);

// Custom request function.
var requestFn = function(query) {
  if (!query) {
    this.results = [];
    this.render();
    return;
  }

  service.textSearch({query: query}, (results, status) => {
    this.results = [];
    if (status === google.maps.places.PlacesServiceStatus.OK) {
      this.results = results.length > 5 ? results.slice(0, 5) : results;
    }
    this.render();
  });
};

var triggerFn = function(obj) {
  var output = document.getElementById('output');
  output.textContent = 'You selected ' + obj.name;
};

var input = document.getElementById('input');
var ac = new AC(input, null, requestFn, null, null, triggerFn);
// This is the key to get the primary text from.
ac.primaryTextKey = 'name';
// This is the key to get the secondary text from. If the key does not exist,
// it will be ignored.
ac.secondaryTextKey = 'formatted_address';
```

In addition, there are two advanced configurations that can be set:

* `delay` is the delay after each keystroke before firing the XHR request, in milliseconds. Default is 300ms.
* `minLength` is the minimum input length required before firing the XHR request. Default is 1.

They are not exposed as part of the constructor function, but can be set after the autocomplete object is created:

```js
var ac = new AC(...);
ac.delay = 500;
ac.minLength = 3;
```

## Styles

The library comes with a [default style](https://github.com/danqing/autocomplete/blob/master/ac.css) for your reference. Start with it so the autocomplete is working, and then modify it to meet your UI requirements.

The following CSS classes are applied to the autocomplete DOM elements if you are using the default rendering system:

```js
AC.CLASS = {
  WRAPPER: 'ac-wrap',
  ROW_WRAPPER: 'ac-rwrap',
  ROW: 'ac-row',
  SELECTED_ROW: 'ac-row selected',
  PRIMARY_SPAN: 'ac-pr',
  SECONDARY_SPAN: 'ac-sc',
  MOBILE_INPUT: 'ac-minput',
  CANCEL: 'ac-cancel'
};
```

## Utilities

The autocomplete library comes with two utility functions that you may find useful:

```js
/**
 * Turns a query dictionary into a HTML-escaped query string.
 *
 * @param {Object} obj The query dict such as {a: 'b', c: 'd'}.
 * @return {string} The encoded query string such as a=b&c=d.
 */
AC.encodeQuery = function encode(obj);

/**
 * Creates DOM elements for autocomplete result input highlighting. With the
 * whitespaces in the input trimmed, the input will be in bold (b) whereas
 * everything else will be left intact (span).
 *
 * @param {string} input The user input string.
 * @param {string} complete The autocompleted string.
 * @return {Fragment} The document fragment that contains the created DOM
 *     elements.
 */
AC.createMatchTextEls = function match(input, complete);
```

The first function may be useful when you construct your URL in the `urlFn`. The second function may be useful if you have custom rendering logic but still want the keyword highlight.

## License

MIT.
