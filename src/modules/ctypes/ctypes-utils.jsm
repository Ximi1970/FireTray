/* -*- Mode: javascript; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* ***** BEGIN LICENSE BLOCK *****
 *	 Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Firetray
 *
 * The Initial Developer of the Original Code is
 * Mozilla Messaging, Ltd.
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *    Chris Coulson <chris.coulson@canonical.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

var EXPORTED_SYMBOLS  = [ "ctypes_library", "is64bit", "WinCbABI" ];

const Cu = Components.utils;

var { ctypes } = ChromeUtils.import("resource://gre/modules/ctypes.jsm");
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");

const is64bit = ctypes.size_t.size == 8; // firetray.Handler.app.ABI.indexOf('_64') > -1;

const WinABI   = is64bit ? ctypes.default_abi : ctypes.winapi_abi;
const WinCbABI = is64bit ? ctypes.default_abi : ctypes.stdcall_abi;

var { Logging } = ChromeUtils.import("resource://firetray/logging.jsm");
let log = Logging.getLogger("firetray.ctypes-utils");
log.info("is64bit="+is64bit);

/**
 * Loads a library using ctypes and exports an object on to the specified
 * global object. The name of the exported object will be the first name
 * specified in the global objects EXPORTED_SYMBOLS list.
 *
 * It is an error to call this function more than once in a JS module. This
 * implies that you should have one JS module per ctypes library.
 *
 * In addition to native types and functions, the exported object will contain
 * some additional utility functions:
 *
 * close      Close the library and unload the JS module
 * available  Returns true if the library is available, false otherwise
 * ABI        A property containing the library ABI loaded (or -1 if unavailable)
 *
 * @param  aName
 *         The name of the library to load, without the "lib" prefix or any
 *         file extension.
 *
 * @param  aABIs
 *         An array of library ABI's to search for. The first one found will
 *         be loaded and the loaded ABI will be saved on the exported object.
 *
 * @param  aDefines
 *         A function which will be called to load library symbols and create
 *         types. The function will be called with one parameter, which contains
 *         several functions for binding symbols. The "this" object will be
 *         the exported object, on to which you can should types and symbols.
 *
 * @param  aGlobal
 *         The global object on to which we export an object. This must be a
 *         a valid JSM global object.
 *
 */
function ctypes_library(aName, aABIs, aDefines, aGlobal) {
  try {
    log.debug("Trying to load library: " + aName);

    if (typeof(aName) != "string") {
      throw Error("Invalid library name");
    }

    if (!aABIs || typeof(aABIs) != "object") {
      throw Error("Invalid range of library ABI's");
    }

    if (typeof(aDefines) != "function") {
      throw Error("Invalid defines function");
    }

    if (!aGlobal || typeof(aGlobal) != "object" || !aGlobal.EXPORTED_SYMBOLS ||
        typeof(aGlobal.EXPORTED_SYMBOLS) != "object") {
      throw Error("Must specify a valid global object from a loaded JS module");
    }

    if (!("__URI__" in aGlobal) || !aGlobal.__URI__) {
      throw Error("This JS module has already been unloaded");
    }

    if (aGlobal[aGlobal.EXPORTED_SYMBOLS[0]]) {
      throw Error("Was ctypes_library() called more than once for this module?");
    }

    var library;
    this.ABI = -1;
    for (let abi of aABIs) {
      // FIXME: ABI is in fact SO_VER. Now we're mixing .so versions and the
      // .dll extension :(
      let libname = abi === 'dll' ? aName :
        "lib" + aName + ".so." + abi.toString();
      log.debug("Trying " + libname);
      try {
        library = ctypes.open(libname);
        this.ABI = abi;
        log.debug("Successfully loaded " + libname);
        break;
      } catch(e) {}
    }

    this.name = aName;

    this.close = function() {
      log.debug("Closing library " + aName);
      library.close();
      this.ABI = -1;

      if (!("__URI__" in aGlobal) || !aGlobal.__URI__) {
        // We could have already been unloaded by now
        return;
      }

      log.debug("Unloading JS module " + aGlobal.__URI__);
      Cu.unload(aGlobal.__URI__);
    };

    this.available = function() {
      return this.ABI != -1;
    };

    if (!library) {
      log.info("Library does not exist: " + aName);
      this.ABI = -1;
      return;
    }

    var self = this;
    let lib = {
      declare: function() {
        try {
          let args = [];
          args.push(arguments[0]);
          // FIXME: ugly hack. We'll see when we need WinCbABI
          if (self.ABI === 'dll') {
            args.push(WinABI);
          } else {
            args.push(ctypes.default_abi);
          }
          for (let arg of Array.prototype.slice.call(arguments, 1)) { 
            args.push(arg);
          }

          return library.declare.apply(library, args);
        } catch (ex) {
          Cu.reportError(ex);
          log.error("Missing symbol " + arguments[0] + " in library " + aName);
          self.ABI = -1;
          return null;
        }
      },

      lazy_bind: function() {
        var args = Array.prototype.slice.call(arguments, 0);
        XPCOMUtils.defineLazyGetter(self, arguments[0], function() {
          return lib.declare.apply(lib, args);
        });
      },

      bind_now: function() {
        self[arguments[0]] = this.declare.apply(this, arguments);
      }
    };

    aDefines.call(this, lib);

    aGlobal[aGlobal.EXPORTED_SYMBOLS[0]] = this;
  } catch(e) {
    Cu.reportError(e);
    log.error(aName+" definition error: "+e);
    this.ABI = -1;
  }
}
