/* -*- Mode: js2; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

var EXPORTED_SYMBOLS = [ "gtk" ];

const GTK_LIBNAME = "gtk-x11-2.0";
const GTK_ABIS    = [ 0 ];

const Cu = Components.utils;
const Cc = Components.classes;
const Ci = Components.interfaces;

var { ctypes } = ChromeUtils.import("resource://gre/modules/ctypes.jsm");
Cu.import("resource://firetray/ctypes/ctypes-utils.jsm");
Cu.import("resource://firetray/ctypes/linux/gio.jsm");
Cu.import("resource://firetray/ctypes/linux/gobject.jsm");
Cu.import("resource://firetray/ctypes/linux/pango.jsm");
Cu.import("resource://firetray/ctypes/linux/gtk2/gdk.jsm");

function gtk_defines(lib) {

  this.FIRETRAY_REQUIRED_GTK_MAJOR_VERSION = 2;
  this.FIRETRAY_REQUIRED_GTK_MINOR_VERSION = 20;
  this.FIRETRAY_REQUIRED_GTK_MICRO_VERSION = 0;

  this.GtkIconSize = ctypes.int; // enum
  this.GTK_ICON_SIZE_INVALID = 0;
  this.GTK_ICON_SIZE_MENU = 1;
  this.GTK_ICON_SIZE_SMALL_TOOLBAR = 2;
  this.GTK_ICON_SIZE_LARGE_TOOLBAR = 3;
  this.GTK_ICON_SIZE_BUTTON = 4;
  this.GTK_ICON_SIZE_DND = 5;
  this.GTK_ICON_SIZE_DIALOG = 6;

  this.GTK_WINDOW_TOPLEVEL = 0; // enum GtkWindowType

  this.GtkStatusIcon = ctypes.StructType("GtkStatusIcon");
  this.GtkStyle = ctypes.StructType("GtkStyle");
  this.GtkRequisition = ctypes.StructType("GtkRequisition", [
    { width: gobject.gint },
    { height: gobject.gint }
  ]);
  this.GtkAllocation = ctypes.StructType("GtkAllocation", [
    { x: gobject.gint },
    { y: gobject.gint },
    { width: gobject.gint },
    { height: gobject.gint }
  ]);
  /* NOTE: recursive struct needs define() and included structs MUST be
   * defined ! */
  this.GtkWidget = ctypes.StructType("GtkWidget");
  this.GtkWidget.define([
    { "style": this.GtkStyle.ptr },
    { "requisition": this.GtkRequisition },
    { "allocation": this.GtkAllocation },
    { "window": gdk.GdkWindow.ptr },
    { "parent": this.GtkWidget.ptr }
  ]);

  this.GtkIconTheme = ctypes.StructType("GtkIconTheme");
  this.GtkMenu = ctypes.StructType("GtkMenu");
  // use ctypes.cast(menu, LibGtkStatusIcon.GtkMenuShell.ptr);
  this.GtkMenuShell = ctypes.StructType("GtkMenuShell");
  this.GtkMenuItem = ctypes.StructType("GtkMenuItem");
  this.GtkImageMenuItem = ctypes.StructType("GtkImageMenuItem");
  this.GtkWindow = ctypes.StructType("GtkWindow");
  this.GtkWindowType = ctypes.int; // enum
  this.GtkSeparatorMenuItem = ctypes.StructType("GtkSeparatorMenuItem");
  this.GtkIconInfo = ctypes.StructType("GtkIconInfo");
  this.GtkIconLookupFlags = ctypes.int; // enum
  this.GTK_ICON_LOOKUP_NO_SVG           = 1 << 0;
  this.GTK_ICON_LOOKUP_FORCE_SVG        = 1 << 1;
  this.GTK_ICON_LOOKUP_USE_BUILTIN      = 1 << 2;
  this.GTK_ICON_LOOKUP_GENERIC_FALLBACK = 1 << 3;
  this.GTK_ICON_LOOKUP_FORCE_SIZE       = 1 << 4;

  this.GtkMenuPositionFunc_t = ctypes.FunctionType(
    ctypes.default_abi, ctypes.void_t,
    [this.GtkMenu.ptr, gobject.gint.ptr, gobject.gint.ptr,
     gobject.gboolean.ptr, gobject.gpointer]).ptr;
  this.GCallbackStatusIconActivate_t = ctypes.FunctionType(
    ctypes.default_abi, gobject.gboolean,
    [this.GtkStatusIcon.ptr, gobject.gpointer]).ptr;
  this.GCallbackMenuPopup_t = ctypes.FunctionType(
    ctypes.default_abi, ctypes.void_t,
    [this.GtkStatusIcon.ptr, gobject.guint, gobject.guint,
     gobject.gpointer]).ptr;
  this.GCallbackOnScroll_t = ctypes.FunctionType(
    ctypes.default_abi, gobject.gboolean,
    [this.GtkStatusIcon.ptr, gdk.GdkEvent.ptr, gobject.gpointer]).ptr;
  this.GCallbackStatusIconMiddleClick_t = this.GCallbackOnScroll_t;
  this.GCallbackGenericEvent_t = ctypes.FunctionType(
    ctypes.default_abi, gobject.gboolean,
    [this.GtkWidget.ptr, gdk.GdkEvent.ptr, gobject.gpointer]).ptr;
  this.GCallbackWindowStateEvent_t = ctypes.FunctionType(
    ctypes.default_abi, gobject.gboolean,
    [this.GtkWidget.ptr, gdk.GdkEventWindowState.ptr, gobject.gpointer]).ptr;
  this.GCallbackWidgetFocusEvent_t = ctypes.FunctionType(
    ctypes.default_abi, gobject.gboolean,
    [this.GtkWidget.ptr, gdk.GdkEventFocus.ptr, gobject.gpointer]).ptr;

  lib.lazy_bind("gtk_check_version", gobject.gchar.ptr, gobject.guint, gobject.guint, gobject.guint);
  this.gtk_get_major_version = function(){return 2;};
  this.gtk_get_minor_version = function(){}; // undefined

  lib.lazy_bind("gtk_icon_theme_get_default", this.GtkIconTheme.ptr);
  lib.lazy_bind("gtk_icon_theme_get_for_screen", this.GtkIconTheme.ptr, gdk.GdkScreen.ptr);
  lib.lazy_bind("gtk_icon_theme_get_search_path", ctypes.void_t, this.GtkIconTheme.ptr, gobject.gchar.ptr.ptr.array(), gobject.gint.ptr);
  lib.lazy_bind("gtk_icon_theme_append_search_path", ctypes.void_t, this.GtkIconTheme.ptr, gobject.gchar.ptr);
  lib.lazy_bind("gtk_icon_theme_prepend_search_path", ctypes.void_t, this.GtkIconTheme.ptr, gobject.gchar.ptr);
  lib.lazy_bind("gtk_icon_theme_choose_icon", this.GtkIconInfo.ptr, this.GtkIconTheme.ptr, gobject.gchar.ptr.array(), gobject.gint, this.GtkIconLookupFlags);
  lib.lazy_bind("gtk_icon_info_load_icon", gdk.GdkPixbuf.ptr, this.GtkIconInfo.ptr, glib.GError.ptr.ptr);
  lib.lazy_bind("gtk_icon_info_free", ctypes.void_t, this.GtkIconInfo.ptr);

  lib.lazy_bind("gtk_status_icon_new", this.GtkStatusIcon.ptr);
  lib.lazy_bind("gtk_status_icon_set_from_file", ctypes.void_t, this.GtkStatusIcon.ptr, ctypes.char.ptr);
  lib.lazy_bind("gtk_status_icon_set_from_icon_name", ctypes.void_t, this.GtkStatusIcon.ptr, gobject.gchar.ptr);
  lib.lazy_bind("gtk_status_icon_set_from_gicon", ctypes.void_t, this.GtkStatusIcon.ptr, gio.GIcon.ptr);
  lib.lazy_bind("gtk_status_icon_set_tooltip_text", ctypes.void_t, this.GtkStatusIcon.ptr, ctypes.char.ptr);
  lib.lazy_bind("gtk_status_icon_set_blinking", ctypes.void_t, this.GtkStatusIcon.ptr, gobject.gboolean); // deprecated in gtk3
  lib.lazy_bind("gtk_status_icon_set_visible", ctypes.void_t, this.GtkStatusIcon.ptr, gobject.gboolean);
  lib.lazy_bind("gtk_menu_new", this.GtkMenu.ptr);
  lib.lazy_bind("gtk_menu_item_set_label", ctypes.void_t, this.GtkMenuItem.ptr, gobject.gchar.ptr);
  lib.lazy_bind("gtk_image_menu_item_new", this.GtkImageMenuItem.ptr);
  lib.lazy_bind("gtk_image_menu_item_new_with_label", this.GtkImageMenuItem.ptr, gobject.gchar.ptr);
  lib.lazy_bind("gtk_image_new_from_stock", this.GtkWidget.ptr, gobject.gchar.ptr, ctypes.int); // enum
  lib.lazy_bind("gtk_image_menu_item_set_image", ctypes.void_t, this.GtkImageMenuItem.ptr, this.GtkWidget.ptr);
  lib.lazy_bind("gtk_menu_shell_append", ctypes.void_t, this.GtkMenuShell.ptr, this.GtkWidget.ptr);
  lib.lazy_bind("gtk_menu_shell_prepend", ctypes.void_t, this.GtkMenuShell.ptr, this.GtkWidget.ptr);
  lib.lazy_bind("gtk_menu_shell_insert", ctypes.void_t, this.GtkMenuShell.ptr, this.GtkWidget.ptr, gobject.gint);
  lib.lazy_bind("gtk_menu_popup", ctypes.void_t, this.GtkMenu.ptr, this.GtkWidget.ptr, this.GtkWidget.ptr, this.GtkMenuPositionFunc_t, gobject.gpointer, gobject.guint, gobject.guint);
  lib.lazy_bind("gtk_status_icon_position_menu", ctypes.void_t, this.GtkMenu.ptr, gobject.gint.ptr, gobject.gint.ptr, gobject.gboolean.ptr, gobject.gpointer);
  lib.lazy_bind("gtk_separator_menu_item_new", this.GtkWidget.ptr);

  lib.lazy_bind("gtk_window_new", this.GtkWidget.ptr, this.GtkWindowType);
  lib.lazy_bind("gtk_widget_create_pango_layout", pango.PangoLayout.ptr, this.GtkWidget.ptr, gobject.gchar.ptr);
  lib.lazy_bind("gtk_widget_destroy", ctypes.void_t, this.GtkWidget.ptr);
  lib.lazy_bind("gtk_status_icon_set_from_pixbuf", ctypes.void_t, this.GtkStatusIcon.ptr, gdk.GdkPixbuf.ptr);
  lib.lazy_bind("gtk_status_icon_get_pixbuf", gdk.GdkPixbuf.ptr, this.GtkStatusIcon.ptr);
  lib.lazy_bind("gtk_status_icon_get_gicon", gio.GIcon.ptr, this.GtkStatusIcon.ptr);
  lib.lazy_bind("gtk_status_icon_get_storage_type", ctypes.int, this.GtkStatusIcon.ptr); // TEST
  lib.lazy_bind("gtk_window_list_toplevels", gobject.GList.ptr);
  lib.lazy_bind("gtk_window_get_title", gobject.gchar.ptr, this.GtkWindow.ptr);
  lib.lazy_bind("gtk_window_is_active", gobject.gboolean, this.GtkWindow.ptr);
  lib.lazy_bind("gtk_window_has_toplevel_focus", gobject.gboolean, this.GtkWindow.ptr);
  lib.lazy_bind("gtk_widget_get_has_window", gobject.gboolean, this.GtkWidget.ptr);
  lib.lazy_bind("gtk_widget_get_window", gdk.GdkWindow.ptr, this.GtkWidget.ptr);
  lib.lazy_bind("gtk_widget_get_parent_window", gdk.GdkWindow.ptr, this.GtkWidget.ptr);
  lib.lazy_bind("gtk_window_set_decorated", ctypes.void_t, this.GtkWindow.ptr, gobject.gboolean);
  lib.lazy_bind("gtk_window_set_urgency_hint", ctypes.void_t, this.GtkWindow.ptr, gobject.gboolean);

  lib.lazy_bind("gtk_widget_is_focus", gobject.gboolean, this.GtkWidget.ptr);
  lib.lazy_bind("gtk_widget_has_focus", gobject.gboolean, this.GtkWidget.ptr);
  lib.lazy_bind("gtk_widget_get_visible", gobject.gboolean, this.GtkWidget.ptr);
  lib.lazy_bind("gtk_widget_hide_on_delete", gobject.gboolean, this.GtkWidget.ptr);
  lib.lazy_bind("gtk_widget_hide", ctypes.void_t, this.GtkWidget.ptr);
  lib.lazy_bind("gtk_widget_show", ctypes.void_t, this.GtkWidget.ptr);
  lib.lazy_bind("gtk_widget_show_all", ctypes.void_t, this.GtkWidget.ptr);
  lib.lazy_bind("gtk_widget_get_events", gobject.gint, this.GtkWidget.ptr);
  lib.lazy_bind("gtk_widget_get_events", gobject.gint, this.GtkWidget.ptr);
  lib.lazy_bind("gtk_widget_add_events", ctypes.void_t, this.GtkWidget.ptr, gobject.gint);
  lib.lazy_bind("gtk_widget_get_toplevel", this.GtkWidget.ptr, this.GtkWidget.ptr);
  lib.lazy_bind("gtk_widget_set_sensitive", ctypes.void_t, this.GtkWidget.ptr, gobject.gboolean);
  lib.lazy_bind("gtk_window_get_type", gobject.GType);
  lib.lazy_bind("gtk_window_get_position", ctypes.void_t, this.GtkWindow.ptr, gobject.gint.ptr, gobject.gint.ptr);
  lib.lazy_bind("gtk_window_move", ctypes.void_t, this.GtkWindow.ptr, gobject.gint, gobject.gint);
  lib.lazy_bind("gtk_window_get_size", ctypes.void_t, this.GtkWindow.ptr, gobject.gint.ptr, gobject.gint.ptr);
  lib.lazy_bind("gtk_window_resize", ctypes.void_t, this.GtkWindow.ptr, gobject.gint, gobject.gint);
  lib.lazy_bind("gtk_window_iconify", ctypes.void_t, this.GtkWindow.ptr);
  lib.lazy_bind("gtk_window_deiconify", ctypes.void_t, this.GtkWindow.ptr);
  lib.lazy_bind("gtk_window_stick", ctypes.void_t, this.GtkWindow.ptr);
  lib.lazy_bind("gtk_window_maximize", ctypes.void_t, this.GtkWindow.ptr);
  lib.lazy_bind("gtk_window_fullscreen", ctypes.void_t, this.GtkWindow.ptr);
  lib.lazy_bind("gtk_window_present", ctypes.void_t, this.GtkWindow.ptr);

}

new ctypes_library(GTK_LIBNAME, GTK_ABIS, gtk_defines, this);
