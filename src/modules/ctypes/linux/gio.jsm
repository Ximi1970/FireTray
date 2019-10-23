/* -*- Mode: js2; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

var EXPORTED_SYMBOLS = [ "gio" ];

const GIO_LIBNAME = "gio-2.0";
const GIO_ABIS    = [ "0" ];

var { ctypes } = ChromeUtils.import("resource://gre/modules/ctypes.jsm");
var { ctypes_library, is64bit, WinCbABI } = ChromeUtils.import("resource://firetray/ctypes/ctypes-utils.jsm");
var { glib } = ChromeUtils.import("resource://firetray/ctypes/linux/glib.jsm");
var { gobject, glib } = ChromeUtils.import("resource://firetray/ctypes/linux/gobject.jsm");

function gio_defines(lib) {
  this.GIcon = ctypes.StructType("GIcon");
  this.GThemedIcon = ctypes.StructType("GThemedIcon");

  lib.lazy_bind("g_themed_icon_new", this.GIcon.ptr, ctypes.char.ptr);
  lib.lazy_bind("g_themed_icon_new_from_names", this.GIcon.ptr, ctypes.char.ptr.ptr, ctypes.int);
  lib.lazy_bind("g_themed_icon_get_names", gobject.gchar.ptr.ptr, this.GThemedIcon.ptr);

  this.GBusType = ctypes.int; // enum
  this.G_BUS_TYPE_STARTER = -1;
  this.G_BUS_TYPE_NONE    = 0;
  this.G_BUS_TYPE_SYSTEM  = 1;
  this.G_BUS_TYPE_SESSION = 2;
  this.GDBusProxyFlags = ctypes.int; // enum
  this.G_DBUS_PROXY_FLAGS_NONE                   = 0;
  this.G_DBUS_PROXY_FLAGS_DO_NOT_LOAD_PROPERTIES = (1<<0);
  this.G_DBUS_PROXY_FLAGS_DO_NOT_CONNECT_SIGNALS = (1<<1);
  this.G_DBUS_PROXY_FLAGS_DO_NOT_AUTO_START      = (1<<2);

  this.GDBusConnection = ctypes.StructType("GDBusConnection");
  this.GCancellable = ctypes.StructType("GCancellable");
  this.GDBusProxy = ctypes.StructType("GDBusProxy");
  this.GDBusInterfaceInfo = ctypes.StructType("GDBusInterfaceInfo");

  lib.lazy_bind("g_bus_get_sync", this.GDBusConnection.ptr, this.GBusType, this.GCancellable.ptr, glib.GError.ptr.ptr);
  lib.lazy_bind("g_dbus_proxy_new_for_bus_sync", this.GDBusProxy.ptr, this.GBusType, this.GDBusProxyFlags, this.GDBusInterfaceInfo.ptr, gobject.gchar.ptr, gobject.gchar.ptr, gobject.gchar.ptr, this.GCancellable.ptr, glib.GError.ptr.ptr);
  lib.lazy_bind("g_dbus_proxy_get_name_owner", gobject.gchar.ptr, this.GDBusProxy.ptr);
}

new ctypes_library(GIO_LIBNAME, GIO_ABIS, gio_defines, this);
