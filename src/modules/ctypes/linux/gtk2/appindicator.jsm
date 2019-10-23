/* -*- Mode: js2; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

var EXPORTED_SYMBOLS = [ "appind" ];

const APPINDICATOR_LIBNAME = "appindicator";
const APPINDICATOR_ABIS    = [ 1 ];

const Cu = Components.utils;
const Cc = Components.classes;
const Ci = Components.interfaces;

var { ctypes } = ChromeUtils.import("resource://gre/modules/ctypes.jsm");
Cu.import("resource://firetray/ctypes/ctypes-utils.jsm");
Cu.import("resource://firetray/ctypes/linux/gobject.jsm");
Cu.import("resource://firetray/ctypes/linux/gtk2/gtk.jsm");

function appindicator_defines(lib) {
  this.AppIndicator = ctypes.StructType("AppIndicator");

  this.INDICATOR_APPLICATION_DBUS_ADDR  = "com.canonical.indicator.application";
  this.INDICATOR_APPLICATION_DBUS_OBJ   = "/com/canonical/indicator/application/service";
  this.INDICATOR_APPLICATION_DBUS_IFACE = "com.canonical.indicator.application.service";
  this.NOTIFICATION_WATCHER_DBUS_ADDR   = "org.kde.StatusNotifierWatcher";
  this.NOTIFICATION_WATCHER_DBUS_OBJ    = "/StatusNotifierWatcher";
  this.NOTIFICATION_WATCHER_DBUS_IFACE  = "org.kde.StatusNotifierWatcher";
  this.NOTIFICATION_ITEM_DBUS_IFACE     = "org.kde.StatusNotifierItem";
  this.NOTIFICATION_ITEM_DEFAULT_OBJ    = "/StatusNotifierItem";
  this.NOTIFICATION_APPROVER_DBUS_IFACE = "org.ayatana.StatusNotifierApprover";

  this.AppIndicatorCategory = ctypes.int;             // enum
  this.APP_INDICATOR_CATEGORY_APPLICATION_STATUS = 0; /*< nick=ApplicationStatus >*/
  this.APP_INDICATOR_CATEGORY_COMMUNICATIONS     = 1; /*< nick=Communications >*/
  this.APP_INDICATOR_CATEGORY_SYSTEM_SERVICES    = 2; /*< nick=SystemServices >*/
  this.APP_INDICATOR_CATEGORY_HARDWARE           = 3; /*< nick=Hardware >*/
  this.APP_INDICATOR_CATEGORY_OTHER              = 4; /*< nick=Other >*/

  this.AppIndicatorStatus = ctypes.int;    // enum
  this.APP_INDICATOR_STATUS_PASSIVE   = 0; /*< nick=Passive >*/
  this.APP_INDICATOR_STATUS_ACTIVE    = 1; /*< nick=Active >*/
  this.APP_INDICATOR_STATUS_ATTENTION = 2; /*< nick=NeedsAttention >*/

  lib.lazy_bind("app_indicator_new", this.AppIndicator.ptr, gobject.gchar.ptr, gobject.gchar.ptr, this.AppIndicatorCategory);
  lib.lazy_bind("app_indicator_new_with_path", this.AppIndicator.ptr, gobject.gchar.ptr, gobject.gchar.ptr, this.AppIndicatorCategory, gobject.gchar.ptr);
  lib.lazy_bind("app_indicator_set_icon_theme_path", ctypes.void_t, this.AppIndicator.ptr, gobject.gchar.ptr);
  lib.lazy_bind("app_indicator_set_status", ctypes.void_t, this.AppIndicator.ptr, this.AppIndicatorStatus);
  lib.lazy_bind("app_indicator_get_status", this.AppIndicatorStatus, this.AppIndicator.ptr);
  lib.lazy_bind("app_indicator_set_menu", ctypes.void_t, this.AppIndicator.ptr, gtk.GtkMenu.ptr);
  lib.lazy_bind("app_indicator_set_icon", ctypes.void_t, this.AppIndicator.ptr, gobject.gchar.ptr);
  lib.lazy_bind("app_indicator_set_icon_full", ctypes.void_t, this.AppIndicator.ptr, gobject.gchar.ptr, gobject.gchar.ptr);
  lib.lazy_bind("app_indicator_set_attention_icon", ctypes.void_t, this.AppIndicator.ptr, gobject.gchar.ptr);
  lib.lazy_bind("app_indicator_set_label", ctypes.void_t, this.AppIndicator.ptr, gobject.gchar.ptr, gobject.gchar.ptr);
  lib.lazy_bind("app_indicator_set_secondary_activate_target", ctypes.void_t, this.AppIndicator.ptr, gtk.GtkWidget.ptr);

  this.ConnectionChangedCb_t = ctypes.FunctionType(
    ctypes.default_abi, ctypes.void_t, [this.AppIndicator.ptr, gobject.gboolean, gobject.gpointer]).ptr;

  this.OnScrollCb_t = ctypes.FunctionType(
    ctypes.default_abi, ctypes.void_t, [this.AppIndicator.ptr, gobject.gint, gobject.guint, gobject.gpointer]).ptr;

  this.OnActivateCb_t = ctypes.FunctionType(
    ctypes.default_abi, ctypes.void_t, [this.AppIndicator.ptr, gobject.gint, gobject.gint, gobject.gpointer]).ptr;
};

var appind = new ctypes_library(APPINDICATOR_LIBNAME, APPINDICATOR_ABIS, appindicator_defines, this);
