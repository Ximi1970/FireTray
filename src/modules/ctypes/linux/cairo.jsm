/* -*- Mode: javascript; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

var EXPORTED_SYMBOLS = [ "cairo" ];

const CAIRO_LIBNAME = "cairo";
const CAIRO_ABIS    = [ 2 ];

var { ctypes } = ChromeUtils.import("resource://gre/modules/ctypes.jsm");
var { ctypes_library, is64bit, WinCbABI } = ChromeUtils.import("resource://firetray/ctypes/ctypes-utils.jsm");

function cairo_defines(lib) {
  this.cairo_format_t = ctypes.int;     // enum
  this.CAIRO_FORMAT_ARGB32 = 0;
  this.CAIRO_FORMAT_RGB24 = 1;
  this.CAIRO_FORMAT_A8 = 2;
  this.CAIRO_FORMAT_A1 = 3;

  this.cairo_t = ctypes.StructType("cairo_t");
  this.cairo_surface_t = ctypes.StructType("cairo_surface_t");

  lib.lazy_bind("cairo_rectangle", ctypes.void_t, this.cairo_t.ptr, ctypes.double, ctypes.double, ctypes.double, ctypes.double);
  lib.lazy_bind("cairo_set_source_rgb", ctypes.void_t, this.cairo_t.ptr, ctypes.double, ctypes.double, ctypes.double);
  lib.lazy_bind("cairo_fill", ctypes.void_t, this.cairo_t.ptr);
  lib.lazy_bind("cairo_move_to", ctypes.void_t, this.cairo_t.ptr, ctypes.double, ctypes.double);
  lib.lazy_bind("cairo_image_surface_create", this.cairo_surface_t.ptr, this.cairo_format_t, ctypes.int, ctypes.int);
  lib.lazy_bind("cairo_surface_destroy", ctypes.void_t, this.cairo_surface_t.ptr);
  lib.lazy_bind("cairo_create", this.cairo_t.ptr, this.cairo_surface_t.ptr);
  lib.lazy_bind("cairo_destroy", ctypes.void_t, this.cairo_t.ptr);

}

new ctypes_library(CAIRO_LIBNAME, CAIRO_ABIS, cairo_defines, this);
