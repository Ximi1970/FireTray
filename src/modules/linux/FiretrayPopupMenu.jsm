/* -*- Mode: js2; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

var EXPORTED_SYMBOLS = [ "firetray" ];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/ctypes.jsm");
Cu.import("resource://firetray/ctypes/linux/gobject.jsm");
Cu.import("resource://firetray/ctypes/linux/gtk.jsm");
Cu.import("resource://firetray/commons.js");

if ("undefined" == typeof(firetray.StatusIcon))
  F.ERROR("This module MUST be imported from/after StatusIcon !");


firetray.PopupMenu = {
  initialized: false,
  callbacks: {menuItemWindowActivate: {}}, // FIXME: try to store them into a ctypes array/struct.
  menu: null,
  menuSeparatorWindows: null,
  MIN_FONT_SIZE: 4,

  init: function() { // FIXME: function too long
    this.menu = gtk.gtk_menu_new();
    var menuShell = ctypes.cast(this.menu, gtk.GtkMenuShell.ptr);
    var addMenuSeparator = false;

    if (firetray.Handler.inBrowserApp) {
		  var menuItemNewWindowLabel = firetray.Utils.strings.GetStringFromName("popupMenu.itemLabel.NewWindow");
      var menuItemNewWindow = gtk.gtk_image_menu_item_new_with_label(
        menuItemNewWindowLabel);
      var menuItemNewWindowIcon = gtk.gtk_image_new_from_stock(
        "gtk-new", gtk.GTK_ICON_SIZE_MENU);
      gtk.gtk_image_menu_item_set_image(menuItemNewWindow, menuItemNewWindowIcon);
      gtk.gtk_menu_shell_append(menuShell, ctypes.cast(menuItemNewWindow, gtk.GtkWidget.ptr));

      this.callbacks.menuItemNewWindowActivate = gobject.GCallback_t(
        firetray.Handler.openBrowserWindow);
      gobject.g_signal_connect(menuItemNewWindow, "activate",
        firetray.PopupMenu.callbacks.menuItemNewWindowActivate, null);

      addMenuSeparator = true;
    }

    if (firetray.Handler.inMailApp) {
		  var menuItemNewMessageLabel = firetray.Utils.strings.GetStringFromName("popupMenu.itemLabel.NewMessage");
      var menuItemNewMessage = gtk.gtk_image_menu_item_new_with_label(
        menuItemNewMessageLabel);
      var menuItemNewMessageIcon = gtk.gtk_image_new_from_stock(
        "gtk-edit", gtk.GTK_ICON_SIZE_MENU);
      gtk.gtk_image_menu_item_set_image(menuItemNewMessage, menuItemNewMessageIcon);
      gtk.gtk_menu_shell_append(menuShell, ctypes.cast(menuItemNewMessage, gtk.GtkWidget.ptr));

      this.callbacks.menuItemNewMessageActivate = gobject.GCallback_t(
        firetray.Handler.openMailMessage);
      gobject.g_signal_connect(menuItemNewMessage, "activate",
        firetray.PopupMenu.callbacks.menuItemNewMessageActivate, null);

      addMenuSeparator = true;
    }

    if (addMenuSeparator) {
      var menuSeparator = gtk.gtk_separator_menu_item_new();
      gtk.gtk_menu_shell_append(menuShell, ctypes.cast(menuSeparator, gtk.GtkWidget.ptr));
    }

    // shouldn't need to convert to utf8 thank to js-ctypes
		var menuItemQuitLabel = firetray.Utils.strings.GetStringFromName("popupMenu.itemLabel.Quit");
    var menuItemQuit = gtk.gtk_image_menu_item_new_with_label(
      menuItemQuitLabel);
    var menuItemQuitIcon = gtk.gtk_image_new_from_stock(
      "gtk-quit", gtk.GTK_ICON_SIZE_MENU);
    gtk.gtk_image_menu_item_set_image(menuItemQuit, menuItemQuitIcon);
    gtk.gtk_menu_shell_append(menuShell, ctypes.cast(menuItemQuit, gtk.GtkWidget.ptr));

    this.callbacks.menuItemQuitActivate = gobject.GCallback_t(
      firetray.Handler.quitApplication);
     gobject.g_signal_connect(menuItemQuit, "activate",
      firetray.PopupMenu.callbacks.menuItemQuitActivate, null);

    var menuWidget = ctypes.cast(this.menu, gtk.GtkWidget.ptr);
    gtk.gtk_widget_show_all(menuWidget);

    var menuSeparatorWindows = gtk.gtk_separator_menu_item_new();
    gtk.gtk_menu_shell_prepend(menuShell, ctypes.cast(menuSeparatorWindows, gtk.GtkWidget.ptr));
    this.menuSeparatorWindows = menuSeparatorWindows;

    this.initialized = true;
    return true;
  },

  shutdown: function() {
    firetray.Utils.tryCloseLibs([gobject, gtk]);
    this.initialized = false;
  },

  popup: function(icon, button, activateTime, menu) {
    F.LOG("menu-popup");
    F.LOG("ARGS="+icon+", "+button+", "+activateTime+", "+menu);

    try {
      var gtkMenuPtr = ctypes.cast(menu, gtk.GtkMenu.ptr);
      var iconGpointer = ctypes.cast(icon, gobject.gpointer);
      gtk.gtk_menu_popup(
        gtkMenuPtr, null, null, gtk.gtk_status_icon_position_menu,
        iconGpointer, button, activateTime);
    } catch (x) { F.ERROR(x); }
  },

  // we'll be creating menuItems for windows (and not showing them) even if
  // hides_single_window is false, because if hides_single_window becomes true,
  // we'll just have to show the menuItems
  addWindowItem: function(xid) { // on registerWindow
    var menuItemWindow = this.createAndAddItemToMenu();
    firetray.Handler.gtkPopupMenuWindowItems.insert(xid, menuItemWindow);
    this.setWindowItemLabel(menuItemWindow, xid.toString()); // default to xid

    this.callbacks.menuItemWindowActivate[xid] = gobject.GCallback_t(
      function(){firetray.Handler.showSingleWindow(xid);});
    gobject.g_signal_connect(menuItemWindow, "activate",
      firetray.PopupMenu.callbacks.menuItemWindowActivate[xid], null);

    F.LOG("added gtkPopupMenuWindowItems: "+firetray.Handler.gtkPopupMenuWindowItems.count);
  },

  createAndAddItemToMenu: function() {
    var menuItem = gtk.gtk_image_menu_item_new();
    var menuShell = ctypes.cast(this.menu, gtk.GtkMenuShell.ptr);
    gtk.gtk_menu_shell_prepend(menuShell, ctypes.cast(menuItem, gtk.GtkWidget.ptr));
    return menuItem;
  },

  removeWindowItem: function(xid) { // on unregisterWindow
    let menuItemWindow = firetray.Handler.gtkPopupMenuWindowItems.get(xid);
    firetray.Handler.gtkPopupMenuWindowItems.remove(xid);
    this.removeItem(menuItemWindow);
    F.LOG("remove gtkPopupMenuWindowItems: "+firetray.Handler.gtkPopupMenuWindowItems.count);
  },
  removeItem: function(item) {
    gtk.gtk_widget_destroy(ctypes.cast(item, gtk.GtkWidget.ptr));
  },

  showAllWindowItemsOnlyVisibleWindows: function() {
    for (let xid in firetray.Handler.windows)
      if (!firetray.Handler.windows[xid].visible)
        this.showSingleWindowItem(xid);
  },

  showSingleWindowItem: function(xid) {
    if (!this.windowItemsHandled())
      return;

    F.LOG("showSingleWindowItem");
    let menuItemWindow = firetray.Handler.gtkPopupMenuWindowItems.get(xid);
    this.showItem(menuItemWindow);
    this.setWindowItemLabel(menuItemWindow, firetray.Window.getWindowTitle(xid));
    this.showWindowSeparator();
  },

  showItem: function(menuItem) {
    gtk.gtk_widget_show(ctypes.cast(menuItem, gtk.GtkWidget.ptr));
  },

  setWindowItemLabel: function(menuItem, label) {
    F.LOG("about to set title: "+label);
    if (label)
      gtk.gtk_menu_item_set_label(ctypes.cast(menuItem, gtk.GtkMenuItem.ptr), label);
  },

  hideAllWindowItems: function() {
    for (let xid in firetray.Handler.windows)
      this.hideSingleWindowItemAndSeparator(xid);
  },

  hideSingleWindowItemAndSeparator: function(xid) {
    this.hideSingleWindowItem(xid);
    this.hideWindowSeparator();
  },

  hideSingleWindowItemAndSeparatorMaybe: function(xid) {
    if (!this.windowItemsHandled())
      return;

    this.hideSingleWindowItem(xid);
    if (firetray.Handler.visibleWindowsCount === firetray.Handler.windowsCount)
      this.hideWindowSeparator();
  },

  hideSingleWindowItem: function(xid) {
    F.LOG("hideSingleWindowItem");
    let menuItemWindow = firetray.Handler.gtkPopupMenuWindowItems.get(xid);
    this.hideItem(menuItemWindow);
  },

  hideItem: function(menuItem) {
    gtk.gtk_widget_hide(ctypes.cast(menuItem, gtk.GtkWidget.ptr));
  },

  showWindowSeparator: function() {
    F.LOG("showing menuSeparatorWindows");
    gtk.gtk_widget_show(ctypes.cast(this.menuSeparatorWindows, gtk.GtkWidget.ptr));
  },
  hideWindowSeparator: function() {
    F.LOG("hiding menuSeparatorWindows");
    gtk.gtk_widget_hide(ctypes.cast(this.menuSeparatorWindows, gtk.GtkWidget.ptr));
  },

  showHideWindowItems: function() {
    if (this.windowItemsHandled())
      this.showAllWindowItemsOnlyVisibleWindows();
    else
      this.hideAllWindowItems();
  },

  windowItemsHandled: function() {
    return (firetray.Handler.inBrowserApp &&
            firetray.Utils.prefService.getBoolPref('hides_single_window'));
  }

}; // firetray.PopupMenu

firetray.Handler.showHidePopupMenuItems = firetray.PopupMenu.showHideWindowItems;
