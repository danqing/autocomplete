/* jslint browser: true, node: true */
/* eslint-disable max-statements */
/* global window, document, setTimeout, XMLHttpRequest */

'use strict';

/**
 * From: https://github.com/danqing/autocomplete/
 * Version: 0.5.1
 *
 * The autocomplete widget.
 *
 * @param {Element} inputEl The input element.
 * @param {Function} urlFn The optional function to return the URL for
 *     retrieving autocomplete results. It takes a single argument, the user
 *     input, and returns a string that can be used to make XHR request. If the
 *     request function is not specified, this function must be provided.
 * @param {Function} requestFn The optional request function that allows full
 *     customization of the behavior when the user types something. It takes a
 *     single argument, the user input, and should write the results into
 *     `self.results` and then call `self.render()` to display the results. If
 *     this function is specified, both urlFn and resultFn are ignored.
 * @param {Function} resultFn The optional function to post-process the
 *     received autocomplete results before displaying them with this widget.
 *     It takes a single argument, the received string response, and returns
 *     an array of autocomplete candidates. If this function is not provided,
 *     the widget will attempt to parse the response as a JSON array.
 * @param {Function} rowFn The optional function to render a row. It takes a
 *     single argument, the full row data object, and returns a DOM element
 *     representing the row. If this function is not provided, the widget will
 *     render the rows with the default `createRow` function.
 * @param {Function} triggerFn The optional function called when an
 *     autocomplete result is selected. First argument is the row object,
 *     second argument is an event object for the user action (click or
 *     keypress).
 * @param {Element} anchorEl The optional DOM element to attach the autocomplete
 *     to. If not provided, the autocomplete is attached to the input element.
 * @constructor
 */
var AC = function init(inputEl, urlFn, requestFn, resultFn, rowFn, triggerFn,
    anchorEl) {
  var self = this;

  /** @type {Element} The input element to attach to. */
  self.inputEl = inputEl;

  /** @type {Element} The element to position the autocomplete below. */
  self.anchorEl = anchorEl || inputEl;

  /** @type {Function} */
  self.triggerFn = triggerFn;

  /** @type {Function} */
  self.resultFn = resultFn;

  /** @type {Function} */
  self.requestFn = requestFn;

  /** @type {Function} */
  self.rowFn = rowFn;

  /** @type {Function} */
  self.urlBuilderFn = urlFn;

  /** @type {string} The user input value. */
  self.value = '';

  /** @type {Element} The wrapper element of the autocomplete. */
  self.el = null;

  /** @type {Element} The wrapper element of the autocomplete rows. */
  self.rowWrapperEl = null;

  /**
   * @type {XMLHttpRequest}
   *
   * The ongoing XHR request for fetching autocomplete results. There can only
   * be one request at a time. New request will kill the existing one if it
   * has not completed.
   */
  self.xhr = null;

  /**
   * @type {number}
   *
   * The delay after each keystroke before firing the remote XHR request, in
   * milliseconds.
   */
  self.delay = 300;

  /**
   * @type {number}
   *
   * The minimum input length required before firing a remote request.
   */
  self.minLength = 1;

  /** @type {Array} Autocomplete results returned directly from server. */
  self.results = [];

  /** @type {Array.<Element>} The array of all result row elements. */
  self.rows = [];

  /** @type {number} The index currently selected. -1 if nothing selected. */
  self.selectedIndex = -1;

  /** @type {string} The key of the primary text in an autocomplete result. */
  self.primaryTextKey = 'title';

  /** @type {string} The key of the secondary text in an autocomplete result. */
  self.secondaryTextKey = 'subtitle';

  /** @type {string} The CSS prefix to use for this instance. */
  self.cssPrefix = 'ac-';

  /**
   * @type {boolean}
   *
   * Whether autocomplete is currently mounted. This should NOT be modified.
   * Call self.mount or self.unmount instead.
   */
  self.isMounted = false;

  /**
   * @type {boolean}
   *
   * Whether the input value is being completed by the right arrow key.
   * Pressing the right arrow key completes the highlighted entry, and going
   * up or down should continue to complete the newly highlighted entry.
   * When the user starts to input again, the "right arrow complete" mode will
   * end.
   */
  self.isRightArrowComplete = false;

  /**
   * @type {Function}
   *
   * The keydown handler. This is saved so it can be unbound when the
   * autocomplete is unmounted.
   */
  self.keydownHandler = self.keydown.bind(self);

  /**
   * @type {Function}
   *
   * The input handler. This is saved so it can be unbound when the
   * autocomplete is unmounted.
   */
  self.inputHandler = self.input.bind(self);

  /**
   * @type {Function}
   *
   * The click handler. This is saved so it can be unbound when the
   * autocomplete is unmounted.
   */
  self.clickHandler = self.click.bind(self);

  /**
   * @type {Function}
   *
   * The resize handler. This is saved so it can be unbound when the
   * autocomplete is unmounted.
   */
  self.resizeHandler = self.position.bind(self);

  /**
   * @type {Function}
   *
   * The mount handler. This is saved so it can be removed if the autocomplete
   * is deactivated completely.
   */
  self.mountHandler = self.mount.bind(self);

  self.activate();
};

AC.KEYCODE = {
  ENTER: 13,
  ESC:   27,
  LEFT:  37,
  UP:    38,
  RIGHT: 39,
  DOWN:  40
};

 /**
  * CSS classes. By default, each string will be prefixed with 'ac-. This can be
  * overridden, by setting the instance property ac.prefix to a different value.
  */
AC.CLASS = {
  WRAPPER:        'wrap',
  ROW_WRAPPER:    'rwrap',
  ROW:            'row',
  SELECTED_ROW:   'row selected',
  PRIMARY_SPAN:   'pr',
  SECONDARY_SPAN: 'sc',
  MOBILE_INPUT:   'minput',
  CANCEL:         'cancel'
};

/**
 * Checks whether the browser is mobile Safari.
 *
 * Mobile Safari does not accept random click events, and so we need to use
 * touch events instead.
 *
 * @returns {boolean} Whether the browser is mobile safari.
 */
AC.isMobileSafari = function safari() {
  var ua  = navigator.userAgent;
  var iOS = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i);

  return iOS && !!ua.match(/WebKit/i) && !ua.match(/CriOS/i);
};

/** Activates the autocomplete for mounting on input focus. */
AC.prototype.activate = function activate() {
  var self = this;

  self.inputEl.addEventListener('focus', self.mountHandler);
};

/** Deactivates the autocomplete. */
AC.prototype.deactivate = function() {
  var self = this;

  // Ensure we're unmounted completely
  self.unmount();
  self.inputEl.removeEventListener('focus', self.mountHandler);
};

/* Get a specific prefixed CSS class */
AC.prototype.getCSS = function(elementID) {
  var className = AC.CLASS[elementID];
  if (className === undefined) {
    throw new Error('CSS element ID "' + elementID + '" not recognized.');
  }
  return this.cssPrefix + className;
}

/** Mounts the autocomplete. */
AC.prototype.mount = function mount() {
  var self      = this;
  var _window   = window;
  var _document = document;

  if (self.isMounted) {
    return;
  }

  if (!self.el) {
    self.el = AC.createEl('div', self.getCSS('WRAPPER'));
    self.el.style.position = 'absolute';
    _document.body.appendChild(self.el);
  } else {
    self.el.style.display = '';
  }

  _window.addEventListener('keydown',    self.keydownHandler);
  _window.addEventListener('input',      self.inputHandler);
  _window.addEventListener('resize',     self.resizeHandler);
  if (AC.isMobileSafari()) {
    _window.addEventListener('touchend', self.clickHandler);
  } else {
    _window.addEventListener('click',    self.clickHandler);
  }

  self.position();
  self.render();
  self.isMounted = true;

  if (Math.max(_document.documentElement.clientWidth,
      _window.innerWidth || 0) < 500) {
    setTimeout(function top() {
      this.inputEl.scrollIntoView();
    }.bind(self), 1);
  }
};

/** Unmounts the autocomplete. */
AC.prototype.unmount = function unmount() {
  var self    = this;
  var _window = window;

  if (!self.isMounted) {
    return;
  }

  _window.removeEventListener('keydown',    self.keydownHandler);
  _window.removeEventListener('input',      self.inputHandler);
  _window.removeEventListener('resize',     self.resizeHandler);
  if (AC.isMobileSafari()) {
    _window.removeEventListener('touchend', self.clickHandler);
  } else {
    _window.removeEventListener('click',    self.clickHandler);
  }

  self.el.style.display = 'none';
  self.inputEl.blur();
  self.isMounted = false;
};

/** Positions the autocomplete to be right beneath the input. */
AC.prototype.position = function position() {
  var self   = this;
  var rect   = self.anchorEl.getBoundingClientRect();
  var offset = AC.findPosition(self.anchorEl);

  self.el.style.top   = offset.top  + rect.height + 'px';
  self.el.style.left  = offset.left + 'px';
  self.el.style.width = rect.width  + 'px';
};

/**
 * Handles keydown event.
 *
 * If the up key is pressed, selects the previous result. If the down key is
 * pressed, selects the next result. If the right key is pressed, completes
 * the current result. If the enter key is pressed, triggers action with the
 * current result. If the escape key is pressed, the input is blurred and the
 * autocomplete is hidden.
 *
 * @param {Event} e The keydown event.
 */
AC.prototype.keydown = function keydown(e) {
  var self = this;

  switch (e.keyCode) {
    case AC.KEYCODE.UP:
      self.setSelectedIndex(self.selectedIndex - 1);
      break;
    case AC.KEYCODE.DOWN:
      self.setSelectedIndex(self.selectedIndex + 1);
      break;
    case AC.KEYCODE.RIGHT:
      if (self.selectedIndex > -1) {
        self.inputEl.value =
            self.results[self.selectedIndex][self.primaryTextKey];
        self.isRightArrowComplete = true;
      }
      break;
    case AC.KEYCODE.ENTER:
      if (self.selectedIndex > -1) {
        self.trigger(e);
      }
      break;
    case AC.KEYCODE.ESC:
      self.inputEl.blur();
      self.unmount();
      break;
    default:
      break;
  }
};

/**
 * Handles input change event. Note that this is different from keydown
 * and is triggered only when the input changes (by user) and after the input
 * is already changed.
 */
AC.prototype.input = function input() {
  var self   = this;
  self.value = self.inputEl.value;
  self.isRightArrowComplete = false;

  clearTimeout(self.timeoutID);
  self.timeoutID = setTimeout(self.requestMatch.bind(self), self.delay);
};

/**
 * Sets the currently selected index. The corresponding row will be
 * highlighted. This function handles overflow and underflow automatically.
 * Note that this means that you cannot 'unselect' using this function.
 *
 * @param {number} i The selected index to set.
 */
AC.prototype.setSelectedIndex = function select(i) {
  var self = this;

  if (!self.results.length) {
    return;
  }

  if (i === self.selectedIndex) {
    return;
  }
  if (i >= self.results.length) {
    i -= self.results.length;
  }
  if (i < 0) {
    i += self.results.length;
  }

  if (self.selectedIndex >= 0) {
    self.rows[self.selectedIndex].className = self.getCSS('ROW');
  }

  self.rows[i].className = self.getCSS('SELECTED_ROW');
  self.selectedIndex = i;

  if (self.isRightArrowComplete) {
    self.inputEl.value = self.results[self.selectedIndex][self.primaryTextKey];
  }
};

/**
 * Handles click/touch event.
 *
 * If the event is in an autocomplete row, the row will be chosen, the trigger
 * will be called, and the widget will be dismissed. If it is in the input or
 * other parts of the widget, nothing will happen. If it is outside, the
 * widget will be dismissed.
 *
 * @param {Event} e The triggering event.
 */
AC.prototype.click = function click(e) {
  var target = e.target || e.srcElement;
  var parent = target;
  var rowid  = -1;
  var self   = this;

  while (parent) {
    if (parent === self.inputEl || parent === self.el) {
      return;
    }

    // Certain DOM elements, notably SVGs, have className property but not
    // className.match. Clicking in such elements should dismiss the AC because
    // it's clicking outside.
    if (!parent.className.match) {
      break;
    }

    if (parent.className.match(self.getCSS('ROW'))) {
      var id = parseInt(parent.getAttribute('data-rid'), 10);
      if (!isNaN(id)) {
        rowid = id;
      }
      break;
    }

    parent = parent.parentElement;
  }

  if (rowid > -1) {
    self.selectedIndex = rowid;
    self.trigger(e);
  } else {
    self.unmount();
  }
};

/**
 * Triggers the selected item. This function sets the value of the input,
 * calls the provided trigger function, and unmounts the autocomplete.
 *
 * @param {Event} event The triggering event.
 */
AC.prototype.trigger = function trigger(event) {
  var self = this;

  self.value = self.results[self.selectedIndex][self.primaryTextKey];
  self.inputEl.value = self.value;
  self.inputEl.blur();
  if (self.triggerFn) {
    self.triggerFn(self.results[self.selectedIndex], event);
  }
  self.unmount();
};

/**
 * Requests autocomplete matches of the given user input. This function first
 * kills pending request if present. If its request succeeds, the autocomplete
 * will be updated. Otherwise the UI will be left unmodified.
 */
AC.prototype.requestMatch = function request() {
  var self = this;

  if (self.requestFn) {
    self.requestFn(self.value);
    return;
  }

  self.abortPendingRequest();

  if (self.value.length < self.minLength) {
    self.results = [];
    self.selectedIndex = -1;
    return;
  }

  var ajax = new XMLHttpRequest();
  ajax.open('GET', self.urlBuilderFn(self.value), true);

  ajax.onload = function onload() {
    var self = this;

    if (ajax.status !== 200) {
      return;
    }

    if (self.resultFn) {
      self.results = self.resultFn(ajax.responseText);
    } else {
      self.results = JSON.parse(ajax.responseText) || [];
    }

    self.render();
  }.bind(self);

  ajax.send();
  self.xhr = ajax;
};

/** Aborts pending request if there is one. */
AC.prototype.abortPendingRequest = function abort() {
  var self = this;
  if (self.xhr && self.xhr.readystate !== 4) {
    self.xhr.abort();
  }
};

/**
 * Renders the autocomplete UI. This function is designed such that repeated
 * calls should yield the same result, although that should obviously be
 * avoided whenever possible.
 */
AC.prototype.render = function render() {
  var self           = this;
  self.selectedIndex = -1;
  self.rows          = [];

  if (self.rowWrapperEl) {
    self.el.removeChild(self.rowWrapperEl);
  }

  self.rowWrapperEl = AC.createEl('div', self.getCSS('ROW_WRAPPER'));

  if (self.results.length) {
    var fragment, i, row;
    fragment = document.createDocumentFragment();
    for (i = 0; i < self.results.length; i++) {
      row = null;
      if (self.rowFn) {
        row = self.rowFn(self.results[i]);
        row.className += ' ' + self.getCSS('ROW');
      } else {
        row = self.createRow(i);
      }
      row.setAttribute('data-rid', i);
      fragment.appendChild(row);
      self.rows.push(row);
    }
    self.rowWrapperEl.appendChild(fragment);
  } else {
    self.rowWrapperEl.style.display = 'none';
  }

  self.el.appendChild(self.rowWrapperEl);
};

/**
 * Creates and returns a row for autocomplete.
 *
 * @param {number} i The index of the row. The data will be retrieved from
 *     this.results. If the row is currently selected, the 'selected' class
 *     will be added.
 * @return {Element} The created row element.
 */
AC.prototype.createRow = function create(i) {
  var self = this;
  var data = self.results[i];
  var el   = AC.createEl('div', self.getCSS('ROW'));

  var primary = AC.createEl('span', self.getCSS('PRIMARY_SPAN'));
  primary.appendChild(AC.createMatchTextEls(self.value,
      data[self.primaryTextKey]));
  el.appendChild(primary);

  if (data[self.secondaryTextKey]) {
    el.appendChild(AC.createEl('span',
        self.getCSS('SECONDARY_SPAN'), data[self.secondaryTextKey]));
  }

  return el;
};

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
AC.createMatchTextEls = function match(input, complete) {
  var fragment = document.createDocumentFragment();
  if (!complete) {
    return fragment;
  }

  input     = input ? input.trim() : '';
  var len   = input.length;
  var index = len ? complete.toLowerCase().indexOf(input.toLowerCase()) : -1;

  if (index === 0) {
    fragment.appendChild(AC.createEl('b', null, complete.substring(0, len)));
    fragment.appendChild(AC.createEl('span', null,
        complete.substring(len, complete.length)));
  } else if (index > 0) {
    fragment.appendChild(AC.createEl('span', null,
        complete.substring(0, index)));
    fragment.appendChild(AC.createEl('b', null,
        complete.substring(index, index + len)));
    fragment.appendChild(AC.createEl('span', null,
        complete.substring(index + len, complete.length)));
  } else {
    fragment.appendChild(AC.createEl('span', null, complete));
  }

  return fragment;
};

/**
 * Creates and returns a DOM element.
 *
 * @param {string} tag The HTML tag of the element, such as div or span.
 * @param {string} className The class name of the element to be created.
 *     If null, no class will be set.
 * @param {string} content The text content of the element to be created.
 *     If null, no content will be set.
 * @return {Element} The created DOM element.
 */
AC.createEl = function create(tag, className, content) {
  var _document = document;
  var el        = _document.createElement(tag);

  if (className) {
    el.className = className;
  }
  if (content) {
    el.appendChild(_document.createTextNode(content));
  }

  return el;
};

/**
 * Finds the position of the element in the page.
 *
 * @param {Element} el The element of interest.
 * @return {Object} The position of the element in {left: x, top: y}.
 */
AC.findPosition = function position(el) {
  var _window   = window;
  var _document = document;

  var r    = el.getBoundingClientRect();
  var top  = r.top  + _window.pageYOffset || _document.documentElement.scrollTop;
  var left = r.left + _window.pageXOffset || _document.documentElement.scrollLeft;

  return {left: left, top: top};
};

/**
 * Turns a query dictionary into a HTML-escaped query string.
 *
 * @param {Object} obj The query dict such as {a: 'b', c: 'd'}.
 * @return {string} The encoded query string such as a=b&c=d.
 */
AC.encodeQuery = function encode(obj) {
  var str = [];
  for (var p in obj) {
    if (obj.hasOwnProperty(p)) {
      str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
    }
  }
  return str.join('&');
};

module.exports = AC;
