/* -*- Mode: javascript; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

var EXPORTED_SYMBOLS = [ "glib" ];

const GLIB_LIBNAME = "glib-2.0";
const GLIB_ABIS    = [ 0 ];

var { ctypes } = ChromeUtils.import("resource://gre/modules/ctypes.jsm");
var { ctypes_library, is64bit, WinCbABI } = ChromeUtils.import("resource://firetray/ctypes/ctypes-utils.jsm");

function glib_defines(lib) {
  /* mutual inclusion not possible */
  this.GQuark = ctypes.uint32_t; // this.GQuark = gobject.guint32;
  this.GError = ctypes.StructType("GError", [
    { domain: this.GQuark },
    { code: ctypes.int },        // gint
    { message: ctypes.char.ptr } // gchar.ptr
  ]);
  this.GBytes = ctypes.StructType("GBytes");
    
  lib.lazy_bind("g_error_free", ctypes.void_t, this.GError.ptr);
  lib.lazy_bind("g_strfreev", ctypes.void_t, ctypes.char.ptr.ptr);
  
  lib.lazy_bind("g_file_get_contents", ctypes.bool, ctypes.char.ptr, ctypes.char.ptr.ptr, ctypes.unsigned_long.ptr, this.GError.ptr.ptr);
  lib.lazy_bind("g_file_set_contents", ctypes.bool, ctypes.char.ptr, ctypes.char.ptr, ctypes.long, this.GError.ptr.ptr);
  
  lib.lazy_bind("g_bytes_new_take", this.GBytes.ptr, ctypes.void_t.ptr, ctypes.unsigned_long);
  lib.lazy_bind("g_bytes_unref", ctypes.void_t, this.GBytes.ptr);
};

new ctypes_library(GLIB_LIBNAME, GLIB_ABIS, glib_defines, this);
