/* -*- Mode: js2; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
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

var EXPORTED_SYMBOLS = [ "gobject", "glib" ];

const GOBJECT_LIBNAME = "gobject-2.0";
const GOBJECT_ABIS = [ 0 ];

var { ctypes } = ChromeUtils.import("resource://gre/modules/ctypes.jsm");
var { ctypes_library, is64bit, WinCbABI } = ChromeUtils.import("chrome://firetray/content/modules/ctypes/ctypes-utils.jsm");
var { glib } = ChromeUtils.import("chrome://firetray/content/modules/ctypes/linux/glib.jsm");

function gobject_defines(lib) {

  this.GSignalMatchType = ctypes.int; // enum
  this.G_SIGNAL_MATCH_ID            = 1 << 0;
  this.G_SIGNAL_MATCH_DETAIL        = 1 << 1;
  this.G_SIGNAL_MATCH_CLOSURE       = 1 << 2;
  this.G_SIGNAL_MATCH_FUNC          = 1 << 3;
  this.G_SIGNAL_MATCH_DATA          = 1 << 4;
  this.G_SIGNAL_MATCH_UNBLOCKED     = 1 << 5;
  this.gpointer = ctypes.voidptr_t;
  this.gulong = ctypes.unsigned_long;
  this.guint = ctypes.unsigned_int;
  this.guint32 = ctypes.uint32_t;
  this.guint16 = ctypes.uint16_t;
  this.gint = ctypes.int;
  this.gint8 = ctypes.int8_t;
  this.gint16 = ctypes.int16_t;
  this.gchar = ctypes.char;
  this.guchar = ctypes.unsigned_char;
  this.gboolean = this.gint;
  this.FALSE = this.gboolean(0);
  this.gfloat = ctypes.float;
  this.gdouble = ctypes.double;
  this.gsize = ctypes.unsigned_long;
  this.GCallback = ctypes.voidptr_t;
  this.GClosureNotify = this.gpointer;
  this.GFunc = ctypes.void_t.ptr;
  this.GList = ctypes.StructType("GList");
  this.GConnectFlags = this.guint; // enum
  this.G_CONNECT_AFTER   = 1 << 0;
  this.G_CONNECT_SWAPPED = 1 << 1;

  this.GType = this.gsize;
  this.GData = ctypes.StructType("GData");
  this._GTypeClass = ctypes.StructType("_GTypeClass", [
    {g_type: this.GType}]);
  this._GTypeInstance = ctypes.StructType("_GTypeInstance", [
    {g_class: this._GTypeClass.ptr}]);
  /* "All the fields in the GObject structure are private to the GObject
   * implementation and should never be accessed directly." but we need to tell
   * something about it to access GdkVisual fields */
  this.GObject = ctypes.StructType("GObject", [
    { g_type_instance: this._GTypeInstance },
    { ref_count: this.guint },
    { qdata: this.GData.ptr },
  ]);
  this.GClosure = ctypes.StructType("GClosure", [
    { in_marshal: this.guint },
    { is_invalid: this.guint },
  ]);

  /* NOTE: if we needed more/different args, we'd need to implement another
     FunctionType */
  this.GCallback_t = ctypes.FunctionType(
    ctypes.default_abi, ctypes.void_t, [this.gpointer]).ptr;
  // intended for g_list_foreach.
  this.GFunc_t = ctypes.FunctionType(
    ctypes.default_abi, ctypes.void_t, [this.gpointer, this.gpointer]).ptr;

  lib.lazy_bind("g_signal_connect_data", this.gulong, this.gpointer, this.gchar.ptr, this.GCallback, this.gpointer, this.GClosureNotify, this.GConnectFlags);

  this.g_signal_connect = function(instance, detailed_signal, handler, data) {
    return this.g_signal_connect_data(instance, detailed_signal, handler, data, null, 0);
  };
  this.g_signal_connect_after = function(instance, detailed_signal, handler, data) {
    return this.g_signal_connect_data(instance, detailed_signal, handler, data, null, this.G_CONNECT_AFTER);
  };

  lib.lazy_bind("g_free", ctypes.void_t, this.gpointer);
  lib.lazy_bind("g_object_ref", this.gpointer, this.gpointer);
  lib.lazy_bind("g_object_unref", ctypes.void_t, this.gpointer);
  lib.lazy_bind("g_list_free", ctypes.void_t, this.GList.ptr);
  lib.lazy_bind("g_list_length", this.guint, this.GList.ptr);
  lib.lazy_bind("g_list_foreach", ctypes.void_t, this.GList.ptr, this.GFunc, this.gpointer);
  lib.lazy_bind("g_signal_lookup", this.guint, this.gchar.ptr, this.GType);
  lib.lazy_bind("g_signal_handler_find", this.gulong, this.gpointer, this.GSignalMatchType, this.guint, glib.GQuark, this.GClosure.ptr, this.gpointer, this.gpointer);
  lib.lazy_bind("g_signal_handler_disconnect", ctypes.void_t, this.gpointer, this.gulong);
  lib.lazy_bind("g_signal_handler_block", ctypes.void_t, this.gpointer, this.gulong);
  lib.lazy_bind("g_signal_handler_unblock", ctypes.void_t, this.gpointer, this.gulong);

  /* NOTE: we can't easily work with g_object_get_property() because it uses
  GValue, which is an opaque struct, and thus can't be initialized by ctypes */
  this.GValue = ctypes.StructType("GValue");
  lib.lazy_bind("g_object_get_property", ctypes.void_t, this.GObject.ptr, this.gchar.ptr, this.GValue.ptr);
  lib.lazy_bind("g_object_get", ctypes.void_t, this.gpointer, this.gchar.ptr, "...");
}

new ctypes_library(GOBJECT_LIBNAME, GOBJECT_ABIS, gobject_defines, this);
