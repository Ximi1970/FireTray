/* -*- Mode: js2; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

var EXPORTED_SYMBOLS = [ "gtk" ];

const GTK_LIBNAME = "gtk-x11-2.0";
const GTK_ABIS    = [ 0 ];

const Cu = Components.utils;
const Cc = Components.classes;
const Ci = Components.interfaces;

Cu.import("resource://gre/modules/ctypes.jsm");
Cu.import("resource://firetray/ctypes/ctypes-utils.jsm");
Cu.import("resource://firetray/ctypes/linux/gdk.jsm");
Cu.import("resource://firetray/ctypes/linux/gobject.jsm");
Cu.import("resource://firetray/ctypes/linux/pango.jsm");

function gtk_defines(lib) {
  this.GTK_ICON_SIZE_MENU = 1; // enum GtkIconSize
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
  this.GCallbackGenericEvent_t = ctypes.FunctionType(
    ctypes.default_abi, gobject.gboolean,
    [this.GtkWidget.ptr, gdk.GdkEvent.ptr, gobject.gpointer]).ptr;
  this.GCallbackWindowStateEvent_t = ctypes.FunctionType(
    ctypes.default_abi, gobject.gboolean,
    [this.GtkWidget.ptr, gdk.GdkEventWindowState.ptr, gobject.gpointer]).ptr;

  lib.lazy_bind("gtk_icon_theme_get_default", this.GtkIconTheme.ptr);
  lib.lazy_bind("gtk_icon_theme_get_for_screen", this.GtkIconTheme.ptr, gdk.GdkScreen.ptr);
  lib.lazy_bind("gtk_icon_theme_append_search_path", ctypes.void_t, this.GtkIconTheme.ptr, gobject.gchar.ptr);
  lib.lazy_bind("gtk_icon_theme_prepend_search_path", ctypes.void_t, this.GtkIconTheme.ptr, gobject.gchar.ptr);

  lib.lazy_bind("gtk_status_icon_new", this.GtkStatusIcon.ptr);
  lib.lazy_bind("gtk_status_icon_set_from_file", ctypes.void_t, this.GtkStatusIcon.ptr, ctypes.char.ptr);
  lib.lazy_bind("gtk_status_icon_set_from_icon_name", ctypes.void_t, this.GtkStatusIcon.ptr, gobject.gchar.ptr);
  lib.lazy_bind("gtk_status_icon_set_tooltip_text", ctypes.void_t, this.GtkStatusIcon.ptr, ctypes.char.ptr);
  lib.lazy_bind("gtk_status_icon_set_visible", ctypes.void_t, this.GtkStatusIcon.ptr, gobject.gboolean);
  lib.lazy_bind("gtk_menu_new", this.GtkMenu.ptr);
  lib.lazy_bind("gtk_menu_item_set_label", ctypes.void_t, this.GtkMenuItem.ptr, gobject.gchar.ptr);
  lib.lazy_bind("gtk_image_menu_item_new", this.GtkImageMenuItem.ptr);
  lib.lazy_bind("gtk_image_menu_item_new_with_label", this.GtkImageMenuItem.ptr, gobject.gchar.ptr);
  lib.lazy_bind("gtk_image_new_from_stock", this.GtkWidget.ptr, gobject.gchar.ptr, ctypes.int); // enum
  lib.lazy_bind("gtk_image_menu_item_set_image", ctypes.void_t, this.GtkImageMenuItem.ptr, this.GtkWidget.ptr);
  lib.lazy_bind("gtk_menu_shell_append", ctypes.void_t, this.GtkMenuShell.ptr, this.GtkWidget.ptr);
  lib.lazy_bind("gtk_menu_shell_prepend", ctypes.void_t, this.GtkMenuShell.ptr, this.GtkWidget.ptr);
  lib.lazy_bind("gtk_widget_show_all", ctypes.void_t, this.GtkWidget.ptr);
  lib.lazy_bind("gtk_menu_popup", ctypes.void_t, this.GtkMenu.ptr, this.GtkWidget.ptr, this.GtkWidget.ptr, this.GtkMenuPositionFunc_t, gobject.gpointer, gobject.guint, gobject.guint);
  lib.lazy_bind("gtk_status_icon_position_menu", ctypes.void_t, this.GtkMenu.ptr, gobject.gint.ptr, gobject.gint.ptr, gobject.gboolean.ptr, gobject.gpointer);
  lib.lazy_bind("gtk_separator_menu_item_new", this.GtkWidget.ptr);

  lib.lazy_bind("gtk_window_new", this.GtkWidget.ptr, this.GtkWindowType);
  lib.lazy_bind("gtk_widget_create_pango_layout", pango.PangoLayout.ptr, this.GtkWidget.ptr, gobject.gchar.ptr);
  lib.lazy_bind("gtk_widget_destroy", ctypes.void_t, this.GtkWidget.ptr);
  lib.lazy_bind("gtk_status_icon_set_from_pixbuf", ctypes.void_t, this.GtkStatusIcon.ptr, gdk.GdkPixbuf.ptr);
  lib.lazy_bind("gtk_window_list_toplevels", gobject.GList.ptr);
  lib.lazy_bind("gtk_window_get_title", gobject.gchar.ptr, this.GtkWindow.ptr);

  lib.lazy_bind("gtk_widget_get_has_window", gobject.gboolean, this.GtkWidget.ptr);
  lib.lazy_bind("gtk_widget_get_window", gdk.GdkWindow.ptr, this.GtkWidget.ptr);
  lib.lazy_bind("gtk_widget_get_parent_window", gdk.GdkWindow.ptr, this.GtkWidget.ptr);
  lib.lazy_bind("gtk_window_set_decorated", ctypes.void_t, this.GtkWindow.ptr, gobject.gboolean);

  lib.lazy_bind("gtk_widget_hide_on_delete", gobject.gboolean, this.GtkWidget.ptr);
  lib.lazy_bind("gtk_widget_hide", ctypes.void_t, this.GtkWidget.ptr);
  lib.lazy_bind("gtk_widget_show", ctypes.void_t, this.GtkWidget.ptr);
  lib.lazy_bind("gtk_widget_get_events", gobject.gint, this.GtkWidget.ptr);
  lib.lazy_bind("gtk_widget_get_events", gobject.gint, this.GtkWidget.ptr);
  lib.lazy_bind("gtk_widget_add_events", ctypes.void_t, this.GtkWidget.ptr, gobject.gint);
  lib.lazy_bind("gtk_window_get_type", gobject.GType);
  lib.lazy_bind("gtk_window_get_position", ctypes.void_t, this.GtkWindow.ptr, gobject.gint.ptr, gobject.gint.ptr);
  lib.lazy_bind("gtk_window_move", ctypes.void_t, this.GtkWindow.ptr, gobject.gint, gobject.gint);
  lib.lazy_bind("gtk_window_get_size", ctypes.void_t, this.GtkWindow.ptr, gobject.gint.ptr, gobject.gint.ptr);
  lib.lazy_bind("gtk_window_resize", ctypes.void_t, this.GtkWindow.ptr, gobject.gint, gobject.gint);
  lib.lazy_bind("gtk_window_iconify", gobject.gint, this.GtkWindow.ptr);
  lib.lazy_bind("gtk_window_stick", gobject.gint, this.GtkWindow.ptr);
  lib.lazy_bind("gtk_window_maximize", gobject.gint, this.GtkWindow.ptr);
  lib.lazy_bind("gtk_window_fullscreen", gobject.gint, this.GtkWindow.ptr);

}

new ctypes_library(GTK_LIBNAME, GTK_ABIS, gtk_defines, this);
