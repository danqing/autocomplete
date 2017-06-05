/**
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
 *     `this.results` and then call `this.render()` to display the results. If
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
 *     autocomplete result is selected.
 * @param {Element} anchorEl The optional DOM element to attach the autocomplete
 *     to. If not provided, the autocomplete is attached to the input element.
 * @constructor
 */
var AC = function init(inputEl, urlFn, requestFn, resultFn, rowFn, triggerFn,
  anchorEl) {
  /** @type {Element} The input element to attach to. */
  this.inputEl = inputEl;

  /** @type {Element} The element to position the autocomplete below. */
  this.anchorEl = anchorEl || inputEl;

  /** @type {Function} */
  this.triggerFn = triggerFn;

  /** @type {Function} */
  this.resultFn = resultFn;

  /** @type {Function} */
  this.requestFn = requestFn;

  /** @type {Function} */
  this.rowFn = rowFn;

  /** @type {Function} */
  this.urlBuilderFn = urlFn;

  /** @type {string} The user input value. */
  this.value = '';

  /** @type {Element} The wrapper element of the autocomplete. */
  this.el = null;

  /** @type {Element} The wrapper element of the autocomplete rows. */
  this.rowWrapperEl = null;

  /**
   * @type {XMLHttpRequest}
   *
   * The ongoing XHR request for fetching autocomplete results. There can only
   * be one request at a time. New request will kill the existing one if it
   * has not completed.
   */
  this.xhr = null;

  /**
   * @type {number}
   *
   * The delay after each keystroke before firing the remote XHR request, in
   * milliseconds.
   */
  this.delay = 300;

  /**
   * @type {number}
   *
   * The minimum input length required before firing a remote request.
   */
  this.minLength = 1;

  /** @type {Array} Autocomplete results returned directly from server. */
  this.results = [];

  /** @type {Array.<Element>} The array of all result row elements. */
  this.rows = [];

  /** @type {number} The index currently selected. -1 if nothing selected. */
  this.selectedIndex = -1;

  /** @type {string} The key of the primary text in an autocomplete result. */
  this.primaryTextKey = 'title';

  /** @type {string} The key of the secondary text in an autocomplete result. */
  this.secondaryTextKey = 'subtitle';

  /**
   * @type {boolean}
   *
   * Whether autocomplete is currently mounted. This should NOT be modified.
   * Call this.mount or this.unmount instead.
   */
  this.isMounted = false;

  /**
   * @type {boolean}
   *
   * Whether the input value is being completed by the right arrow key.
   * Pressing the right arrow key completes the highlighted entry, and going
   * up or down should continue to complete the newly highlighted entry.
   * When the user starts to input again, the "right arrow complete" mode will
   * end.
   */
  this.isRightArrowComplete = false;

  /**
   * @type {Function}
   *
   * The keydown handler. This is saved so it can be unbound when the
   * autocomplete is unmounted.
   */
  this.keydownHandler = this.keydown.bind(this);

  /**
   * @type {Function}
   *
   * The input handler. This is saved so it can be unbound when the
   * autocomplete is unmounted.
   */
  this.inputHandler = this.input.bind(this);

  /**
   * @type {Function}
   *
   * The click handler. This is saved so it can be unbound when the
   * autocomplete is unmounted.
   */
  this.clickHandler = this.click.bind(this);

  /**
   * @type {Function}
   *
   * The resize handler. This is saved so it can be unbound when the
   * autocomplete is unmounted.
   */
  this.resizeHandler = this.position.bind(this);

  this.activate();
};

AC.KEYCODE = {
  ENTER: 13,
  ESC: 27,
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40
};

/** CSS classes. */
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

/**
 * Checks whether the browser is mobile Safari.
 *
 * Mobile Safari does not accept random click events, and so we need to use
 * touch events instead.
 *
 * @returns {boolean} Whether the browser is mobile safari.
 */
AC.isMobileSafari = function safari() {
  var ua = navigator.userAgent;
  var iOS = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i);
  return iOS && !!ua.match(/WebKit/i) && !ua.match(/CriOS/i);
};

/** Activates the autocomplete for mounting on input focus. */
AC.prototype.activate = function activate() {
  this.inputEl.addEventListener('focus', this.mount.bind(this));
};

/** Mounts the autocomplete. */
AC.prototype.mount = function mount() {
  if (this.isMounted) {
    return;
  }

  if (!this.el) {
    this.el = AC.createEl('div', AC.CLASS.WRAPPER);
    this.el.style.position = 'absolute';
    document.body.appendChild(this.el);
  } else {
    this.el.style.display = '';
  }

  window.addEventListener('keydown', this.keydownHandler);
  window.addEventListener('input', this.inputHandler);
  window.addEventListener('resize', this.resizeHandler);
  if (AC.isMobileSafari()) {
    window.addEventListener('touchend', this.clickHandler);
  } else {
    window.addEventListener('click', this.clickHandler);
  }

  this.position();
  this.render();
  this.isMounted = true;

  if (Math.max(document.documentElement.clientWidth,
      window.innerWidth || 0) < 500) {
    setTimeout(function top() {
      this.inputEl.scrollIntoView();
    }.bind(this), 1);
  }
};

/** Unmounts the autocomplete. */
AC.prototype.unmount = function unmount() {
  if (!this.isMounted) {
    return;
  }

  window.removeEventListener('keydown', this.keydownHandler);
  window.removeEventListener('input', this.inputHandler);
  window.removeEventListener('resize', this.resizeHandler);
  if (AC.isMobileSafari()) {
    window.removeEventListener('touchend', this.clickHandler);
  } else {
    window.removeEventListener('click', this.clickHandler);
  }

  this.el.style.display = 'none';
  this.inputEl.blur();
  this.isMounted = false;
};

/** Positions the autocomplete to be right beneath the input. */
AC.prototype.position = function position() {
  var rect = this.anchorEl.getBoundingClientRect();
  var offset = AC.findPosition(this.anchorEl);
  this.el.style.top = offset.top + rect.height + 'px';
  this.el.style.left = offset.left + 'px';
  this.el.style.width = rect.width + 'px';
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
  switch (e.keyCode) {
    case AC.KEYCODE.UP:
      this.setSelectedIndex(this.selectedIndex - 1);
      break;
    case AC.KEYCODE.DOWN:
      this.setSelectedIndex(this.selectedIndex + 1);
      break;
    case AC.KEYCODE.RIGHT:
      if (this.selectedIndex > -1) {
        this.inputEl.value =
          this.results[this.selectedIndex][this.primaryTextKey];
        this.isRightArrowComplete = true;
      }
      break;
    case AC.KEYCODE.ENTER:
      if (this.selectedIndex > -1) {
        this.trigger();
      }
      break;
    case AC.KEYCODE.ESC:
      this.inputEl.blur();
      this.unmount();
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
  this.value = this.inputEl.value;
  this.isRightArrowComplete = false;
  clearTimeout(this.timeoutID);
  this.timeoutID = setTimeout(this.requestMatch.bind(this), this.delay);
};

/**
 * Sets the currently selected index. The corresponding row will be
 * highlighted. This function handles overflow and underflow automatically.
 * Note that this means that you cannot 'unselect' using this function.
 *
 * @param {number} i The selected index to set.
 */
AC.prototype.setSelectedIndex = function select(i) {
  if (!this.results.length) {
    return;
  }

  if (i === this.selectedIndex) {
    return;
  }
  if (i >= this.results.length) {
    i -= this.results.length;
  }
  if (i < 0) {
    i += this.results.length;
  }

  if (this.selectedIndex >= 0) {
    this.rows[this.selectedIndex].className = AC.CLASS.ROW;
  }

  this.rows[i].className = AC.CLASS.SELECTED_ROW;
  this.selectedIndex = i;

  if (this.isRightArrowComplete) {
    this.inputEl.value = this.results[this.selectedIndex][this.primaryTextKey];
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
  var rowid = -1;

  while (parent) {
    if (parent === this.inputEl || parent === this.el) {
      return;
    }

    if (parent.className.match(AC.CLASS.ROW)) {
      var id = parseInt(parent.getAttribute('data-rid'), 10);
      if (!isNaN(id)) {
        rowid = id;
      }
      break;
    }

    parent = parent.parentElement;
  }

  if (rowid > -1) {
    this.selectedIndex = rowid;
    this.trigger(rowid);
  } else {
    this.unmount();
  }
};

/**
 * Triggers the selected item. This function sets the value of the input,
 * calls the provided trigger function, and unmounts the autocomplete.
 */
AC.prototype.trigger = function trigger() {
  this.value = this.results[this.selectedIndex][this.primaryTextKey];
  this.inputEl.value = this.value;
  this.inputEl.blur();
  if (this.triggerFn) {
    this.triggerFn(this.results[this.selectedIndex]);
  }
  this.unmount();
};

/**
 * Requests autocomplete matches of the given user input. This function first
 * kills pending request if present. If its request succeeds, the autocomplete
 * will be updated. Otherwise the UI will be left unmodified.
 */
AC.prototype.requestMatch = function request() {
  if (this.requestFn) {
    this.requestFn(this.value);
    return;
  }

  this.abortPendingRequest();

  if (this.value.length < this.minLength) {
    this.results = [];
    this.selectedIndex = -1;
    return;
  }

  var ajax = new XMLHttpRequest();
  ajax.open('GET', this.urlBuilderFn(this.value), true);

  ajax.onload = function onload() {
    if (ajax.status !== 200) {
      return;
    }

    if (this.resultFn) {
      this.results = this.resultFn(ajax.responseText);
    } else {
      this.results = JSON.parse(ajax.responseText) || [];
    }

    this.render();
  }.bind(this);

  ajax.send();
  this.xhr = ajax;
};

/** Aborts pending request if there is one. */
AC.prototype.abortPendingRequest = function abort() {
  if (this.xhr && this.xhr.readystate !== 4) {
    this.xhr.abort();
  }
};

/**
 * Renders the autocomplete UI. This function is designed such that repeated
 * calls should yield the same result, although that should obviously be
 * avoided whenever possible.
 */
AC.prototype.render = function render() {
  this.selectedIndex = -1;
  this.rows = [];

  if (this.rowWrapperEl) {
    this.el.removeChild(this.rowWrapperEl);
  }

  this.rowWrapperEl = AC.createEl('div', AC.CLASS.ROW_WRAPPER);

  if (this.results.length) {
    var fragment = document.createDocumentFragment();
    for (var i = 0; i < this.results.length; i++) {
      var row = null;
      if (this.rowFn) {
        row = this.rowFn(this.results[i]);
        row.className += ' ' + AC.CLASS.ROW;
      } else {
        row = this.createRow(i);
      }
      row.setAttribute('data-rid', i);
      fragment.appendChild(row);
      this.rows.push(row);
    }
    this.rowWrapperEl.appendChild(fragment);
  } else {
    this.rowWrapperEl.style.display = 'none';
  }

  this.el.appendChild(this.rowWrapperEl);
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
  var data = this.results[i];
  var el = AC.createEl('div', AC.CLASS.ROW);

  var primary = AC.createEl('span', AC.CLASS.PRIMARY_SPAN);
  primary.appendChild(AC.createMatchTextEls(this.value,
    data[this.primaryTextKey]));
  el.appendChild(primary);

  if (data[this.secondaryTextKey]) {
    el.appendChild(AC.createEl('span',
      AC.CLASS.SECONDARY_SPAN, data[this.secondaryTextKey]));
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

  input = input ? input.trim() : '';
  var len = input.length;
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
  var el = document.createElement(tag);

  if (className) {
    el.className = className;
  }
  if (content) {
    el.appendChild(document.createTextNode(content));
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
  var r = el.getBoundingClientRect();
  var top = r.top + window.pageYOffset || document.documentElement.scrollTop;
  var left = r.left + window.pageXOffset || document.documentElement.scrollLeft;
  return {
    left: left,
    top: top
  };
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
