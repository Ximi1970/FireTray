/* -*- Mode: javascript; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

var EXPORTED_SYMBOLS = [ "pangocairo" ];

const PANGOCAIRO_LIBNAME = "pangocairo-1.0";
const PANGOCAIRO_ABIS    = [ 0 ];

const Cu = Components.utils;
const Cc = Components.classes;
const Ci = Components.interfaces;

var { ctypes } = ChromeUtils.import("resource://gre/modules/ctypes.jsm");
var { ctypes_library, is64bit, WinCbABI } = ChromeUtils.import("chrome://firetray/content/modules/ctypes/ctypes-utils.jsm");
var { cairo } = ChromeUtils.import("chrome://firetray/content/modules/ctypes/linux/cairo.jsm");
var { gobject, glib } = ChromeUtils.import("chrome://firetray/content/modules/ctypes/linux/gobject.jsm");
var { pango, pangocairo } = ChromeUtils.import("chrome://firetray/content/modules/ctypes/linux/pango.jsm");

function pangocairo_defines(lib) {
  lib.lazy_bind("pango_cairo_show_layout", ctypes.void_t, cairo.cairo_t.ptr, pango.PangoLayout.ptr);
}

new ctypes_library(PANGOCAIRO_LIBNAME, PANGOCAIRO_ABIS, pangocairo_defines, this);
