/* -*- Mode: js2; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

var EXPORTED_SYMBOLS = [ "ctypesMap", "FIRETRAY_WINDOW_COUNT_MAX", "DeleteError" ];

var { ctypes } = ChromeUtils.import("resource://gre/modules/ctypes.jsm");

const FIRETRAY_WINDOW_COUNT_MAX = 64;

var { Logging } = ChromeUtils.import("chrome://firetray/content/modules/logging.jsm");
let log = Logging.getLogger("firetray.ctypesMap");

/**
 * basic Hash mapping a key (of any type) to a cell in a ctypes array
 */
function ctypesMap(t) {
  this.array = ctypes.ArrayType(t)(FIRETRAY_WINDOW_COUNT_MAX);
  this.indexLast = -1;
  this.freedCells = [];         // indices of freed cells
  this.count = 0;               // count of actually stored things
  this.map = {};                // map key -> index
};

ctypesMap.prototype.get = function(key) {
  if (!this.map.hasOwnProperty(key))
      throw new RangeError('Unknown key: '+key);

  return this.array[this.map[key]];
};

Object.defineProperties(ctypesMap.prototype, {
  "keys": {get: function(){return Object.keys(this.map);} }
});

ctypesMap.prototype.insert = function(key, item) {
  if (this.map.hasOwnProperty(key)) {
    log.debug("REPLACE");
    this.array[this.map[key]] = item;

  } else if (this.freedCells.length) {
    log.debug("USE FREE CELL");
    let idx = this.freedCells.shift();
    this.array[idx] = item;
    this.map[key] = idx;
    this.count += 1;

  } else {
    let indexNext = this.indexLast + 1;
    if (indexNext >= FIRETRAY_WINDOW_COUNT_MAX)
      throw new RangeError('Array overflow');

    this.indexLast = indexNext;
    this.array[this.indexLast] = item;
    this.map[key] = this.indexLast;
    this.count += 1;
  }
};

ctypesMap.prototype.remove = function(key) {
  if (!this.map.hasOwnProperty(key))
      throw new RangeError('Unknown key: '+key);
  log.debug("FREE CELL");

  let idx = this.map[key];
  if (!delete this.map[key])
    throw new DeleteError();
  this.freedCells.unshift(idx);
  this.count -= 1;
};


// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error#Custom_Error_Types
function DeleteError(message) {
  this.name = "DeleteError";
  this.message = message || "Could not delete object memeber";
}
DeleteError.prototype = new Error();
DeleteError.prototype.constructor = DeleteError;
