/* -*- Mode: js2; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

var EXPORTED_SYMBOLS = ["libfiretray"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");

var { Logging } = ChromeUtils.import("resource://firetray/logging.jsm");
let log = Logging.getLogger("firetray.libfiretray");

const _path = (function(){
  var uri = Services.io.newURI('resource://firetray-lib', null, null);
  path = null;
  try {
    if (uri instanceof Ci.nsIFileURL)
      path = uri.file.path;
  } catch(error) {
    log.error(error);
    throw new Error("path not resolved");
  }
  return path;
})();

/*
 * the firetray is not a standard lib, with standard naming, so we have to
 * mimic ctypes-utils
 */
var libfiretray = {

  _lib: null,
  name: 'libfiretray',
  _available: false,
  available: function(){return this._available;}, // compliance with ctypes-utils

  init: function() {
    log.info("__URI__1="+this.__URI__);
    log.info("__URI__2="+this.global.__URI__);

    // If ctypes doesn't exist, try to get it
    Cu.import("resource://gre/modules/ctypes.jsm");
    // If we still don't have ctypes, this isn't going to work...
    if (typeof(ctypes) == "undefined") {
      throw ("Could not load JS-Ctypes");
    }

    try {
      // Try to start up dependencies - if they fail, they'll throw
      // exceptions. ex: GObjectLib.init();

      this._lib = ctypes.open(_path);
      if (!this._lib)
        throw ("Could not load " + _path);

    } catch (e) {
      this.shutdown();
      throw(e);
    }

    this._available = true;

    // Ok, we got everything - let's declare.
    this._declare();
  },

  shutdown: function() {
    log.debug("Closing library " + this.name);
    // Close our connection to the library.
    if (this._lib)
      this._lib.close();

    this._available = false;

    if (!("__URI__" in this.global) || !this.global.__URI__) {
      // We could have already been unloaded by now
      return;
    }

    log.debug("Unloading JS module " + this.global.__URI__);
    Cu.unload(this.global.__URI__);
  },

  _declare: function() {
    this.gdk_is_window = this._lib.declare("gdk_is_window", ctypes.default_abi, ctypes.int, ctypes.void_t.ptr);
    this.gtk_is_window = this._lib.declare("gtk_is_window", ctypes.default_abi, ctypes.int, ctypes.void_t.ptr);
    this.gtk_is_widget = this._lib.declare("gtk_is_widget", ctypes.default_abi, ctypes.int, ctypes.void_t.ptr);
    this.gtk_get_major_version = this._lib.declare("gtk_get_major_version", ctypes.default_abi, ctypes.unsigned_int);
    this.gtk_get_minor_version = this._lib.declare("gtk_get_minor_version", ctypes.default_abi, ctypes.unsigned_int);
    this.gtk_get_micro_version = this._lib.declare("gtk_get_micro_version", ctypes.default_abi, ctypes.unsigned_int);
  }

};
libfiretray.global = this;

libfiretray.close = libfiretray.shutdown; // compliance with ctypes-utils

libfiretray.init();
