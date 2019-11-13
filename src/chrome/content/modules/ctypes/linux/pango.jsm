/* -*- Mode: javascript; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

var EXPORTED_SYMBOLS = [ "pango", "pangocairo" ];

const PANGO_LIBNAME = "pango-1.0";
const PANGO_ABIS    = [ 0 ];

var { ctypes } = ChromeUtils.import("resource://gre/modules/ctypes.jsm");
var { ctypes_library, is64bit, WinCbABI } = ChromeUtils.import("chrome://firetray/content/modules/ctypes/ctypes-utils.jsm");
var { cairo } = ChromeUtils.import("chrome://firetray/content/modules/ctypes/linux/cairo.jsm");
var { gobject, glib } = ChromeUtils.import("chrome://firetray/content/modules/ctypes/linux/gobject.jsm");

function pango_defines(lib) {
  this.PANGO_WEIGHT_THIN       = 100;
  this.PANGO_WEIGHT_ULTRALIGHT = 200;
  this.PANGO_WEIGHT_LIGHT      = 300;
  this.PANGO_WEIGHT_BOOK       = 380;
  this.PANGO_WEIGHT_NORMAL     = 400;
  this.PANGO_WEIGHT_MEDIUM     = 500;
  this.PANGO_WEIGHT_SEMIBOLD   = 600;
  this.PANGO_WEIGHT_BOLD       = 700;
  this.PANGO_WEIGHT_ULTRABOLD  = 800;
  this.PANGO_WEIGHT_HEAVY      = 900;
  this.PANGO_WEIGHT_ULTRAHEAVY = 1000;
  this.PANGO_SCALE = 1024;

  this.PangoFontDescription = ctypes.StructType("PangoFontDescription");
  this.PangoLayout = ctypes.StructType("PangoLayout");
  this.PangoWeight = ctypes.int; // enum

  lib.lazy_bind("pango_font_description_from_string", this.PangoFontDescription.ptr, ctypes.char.ptr);
  lib.lazy_bind("pango_font_description_set_weight", ctypes.void_t, this.PangoFontDescription.ptr, this.PangoWeight);
  lib.lazy_bind("pango_layout_set_spacing", ctypes.void_t, this.PangoLayout.ptr, ctypes.int);
  lib.lazy_bind("pango_layout_set_font_description", ctypes.void_t, this.PangoLayout.ptr, this.PangoFontDescription.ptr);
  lib.lazy_bind("pango_layout_set_text", ctypes.void_t, this.PangoLayout.ptr, ctypes.char.ptr, ctypes.int);
  lib.lazy_bind("pango_layout_get_pixel_size", ctypes.void_t, this.PangoLayout.ptr, ctypes.int.ptr, ctypes.int.ptr);
  lib.lazy_bind("pango_font_description_get_size", gobject.gint, this.PangoFontDescription.ptr);
  lib.lazy_bind("pango_font_description_set_size", ctypes.void_t, this.PangoFontDescription.ptr, gobject.gint);
  lib.lazy_bind("pango_font_description_free", ctypes.void_t, this.PangoFontDescription.ptr);

}

new ctypes_library(PANGO_LIBNAME, PANGO_ABIS, pango_defines, this);
