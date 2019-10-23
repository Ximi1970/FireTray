/* -*- Mode: javascript; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

var EXPORTED_SYMBOLS = [ "gdk" ];

const GDK_LIBNAME = "gdk-3";
const GDK_ABIS    = [ 0 ];

const Cu = Components.utils;
const Cc = Components.classes;
const Ci = Components.interfaces;

var { ctypes } = ChromeUtils.import("resource://gre/modules/ctypes.jsm");
Cu.import("resource://firetray/ctypes/ctypes-utils.jsm");
Cu.import("resource://firetray/ctypes/linux/cairo.jsm");
Cu.import("resource://firetray/ctypes/linux/gobject.jsm");
Cu.import("resource://firetray/ctypes/linux/x11.jsm");
Cu.import("resource://firetray/ctypes/linux/gdk23.jsm");

function gdk_defines(lib) {

  gdk23_defines.call(this, lib);

  this.GDK_SCROLL_SMOOTH = 4;

  this.GdkWindowAttributesType = ctypes.int; // enum
  this.GDK_WA_TITLE     = 1 << 1;
  this.GDK_WA_X         = 1 << 2;
  this.GDK_WA_Y         = 1 << 3;
  this.GDK_WA_CURSOR    = 1 << 4;
  this.GDK_WA_VISUAL    = 1 << 5,
  this.GDK_WA_WMCLASS   = 1 << 6,
  this.GDK_WA_NOREDIR   = 1 << 7,
  this.GDK_WA_TYPE_HINT = 1 << 8

  this.GdkWindowType         = ctypes.int; // enum
  this.GDK_WINDOW_ROOT       = 0;
  this.GDK_WINDOW_TOPLEVEL   = 1;
  this.GDK_WINDOW_CHILD      = 2;
  this.GDK_WINDOW_TEMP       = 3;
  this.GDK_WINDOW_FOREIGN    = 4;
  this.GDK_WINDOW_OFFSCREEN  = 5;
  this.GDK_WINDOW_SUBSURFACE = 6;

  this.GdkWindowAttr = ctypes.StructType("GdkWindowAttr", [
    { "title": gobject.gchar.ptr },
    { "event_mask": gobject.gint },
    { "x": gobject.gint },
    { "y": gobject.gint },
    { "width": gobject.gint },
    { "height": gobject.gint },
    { "wclass": gobject.gint },
    { "visual": this.GdkVisual.ptr },
    { "window_type": gobject.gint },
    { "cursor": this.GdkCursor.ptr },
    { "wmclass_name": gobject.gchar },
    { "wmclass_class": gobject.gchar },
    { "override_redirect": gobject.gboolean },
    { "type_hint": gobject.gint }
  ]);

  lib.lazy_bind("gdk_cairo_create", cairo.cairo_t.ptr, this.GdkWindow.ptr);
  lib.lazy_bind("gdk_pixbuf_get_from_window", this.GdkPixbuf.ptr, this.GdkWindow.ptr, ctypes.int, ctypes.int, ctypes.int, ctypes.int);
  lib.lazy_bind("gdk_x11_window_get_xid", x11.XID, this.GdkWindow.ptr);
  lib.lazy_bind("gdk_window_new", this.GdkWindow.ptr, this.GdkWindow.ptr, this.GdkWindowAttr.ptr, gobject.gint);
  lib.lazy_bind("gdk_pixbuf_get_from_surface", this.GdkPixbuf.ptr, cairo.cairo_surface_t.ptr, gobject.gint, gobject.gint, gobject.gint, gobject.gint);

}

new ctypes_library(GDK_LIBNAME, GDK_ABIS, gdk_defines, this);
