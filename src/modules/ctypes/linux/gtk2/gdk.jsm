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
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *    Mike Conley <mconley@mozillamessaging.com>
 *    Foudil Brétel <foudil.newbie+amo@gmail.com>
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

var EXPORTED_SYMBOLS = [ "gdk" ];

const GDK_LIBNAME = "gdk-x11-2.0";
const GDK_ABIS    = [ 0 ];

const Cu = Components.utils;

var { ctypes } = ChromeUtils.import("resource://gre/modules/ctypes.jsm");
var { ctypes_library, is64bit, WinCbABI } = ChromeUtils.import("resource://firetray/ctypes/ctypes-utils.jsm");
Cu.import("resource://firetray/ctypes/linux/cairo.jsm");
Cu.import("resource://firetray/ctypes/linux/gobject.jsm");
Cu.import("resource://firetray/ctypes/linux/x11.jsm");
Cu.import("resource://firetray/ctypes/linux/gdk23.jsm");

function gdk_defines(lib) {

  gdk23_defines.call(this, lib);

  this.GdkWindowAttributesType = ctypes.int; // enum
  this.GDK_WA_TITLE     = 1 << 1;
  this.GDK_WA_X         = 1 << 2;
  this.GDK_WA_Y         = 1 << 3;
  this.GDK_WA_CURSOR    = 1 << 4;
  this.GDK_WA_COLORMAP  = 1 << 5;
  this.GDK_WA_VISUAL    = 1 << 6;
  this.GDK_WA_WMCLASS   = 1 << 7;
  this.GDK_WA_NOREDIR   = 1 << 8;
  this.GDK_WA_TYPE_HINT = 1 << 9;

  this.GdkWindowType        = ctypes.int; // enum
  this.GDK_WINDOW_ROOT      = 0;
  this.GDK_WINDOW_TOPLEVEL  = 1;
  this.GDK_WINDOW_CHILD     = 2;
  this.GDK_WINDOW_DIALOG    = 3;
  this.GDK_WINDOW_TEMP      = 4;
  this.GDK_WINDOW_FOREIGN   = 5;
  this.GDK_WINDOW_OFFSCREEN = 6;

  this.GdkPixmap = ctypes.StructType("GdkPixmap");
  this.GdkDrawable = ctypes.StructType("GdkDrawable");
  this.GdkWindowAttributes = ctypes.StructType("GdkWindowAttributes", [
    { "title": gobject.gchar.ptr },
    { "event_mask": gobject.gint },
    { "x": gobject.gint },
    { "y": gobject.gint },
    { "width": gobject.gint },
    { "height": gobject.gint },
    { "wclass": gobject.gint },
    { "visual": this.GdkVisual.ptr },
    { "colormap": this.GdkColormap.ptr },
    { "window_type": gobject.gint },
    { "cursor": this.GdkCursor.ptr },
    { "wmclass_name": gobject.gchar },
    { "wmclass_class": gobject.gchar },
    { "override_redirect": gobject.gboolean },
    { "type_hint": gobject.gint }
  ]);

  lib.lazy_bind("gdk_cairo_create", cairo.cairo_t.ptr, this.GdkDrawable.ptr);
  lib.lazy_bind("gdk_drawable_get_size", ctypes.void_t, this.GdkDrawable.ptr, gobject.gint.ptr, gobject.gint.ptr);
  lib.lazy_bind("gdk_pixbuf_get_from_drawable", this.GdkPixbuf.ptr, this.GdkPixbuf.ptr, this.GdkDrawable.ptr, this.GdkColormap.ptr, ctypes.int, ctypes.int, ctypes.int, ctypes.int, ctypes.int, ctypes.int);
  lib.lazy_bind("gdk_pixmap_new", this.GdkPixmap.ptr, this.GdkDrawable.ptr, gobject.gint, gobject.gint, gobject.gint);
  lib.lazy_bind("gdk_window_new", this.GdkWindow.ptr, this.GdkWindow.ptr, this.GdkWindowAttributes.ptr, gobject.gint);
  lib.lazy_bind("gdk_x11_drawable_get_xid", x11.XID, this.GdkDrawable.ptr);

}

new ctypes_library(GDK_LIBNAME, GDK_ABIS, gdk_defines, this);
