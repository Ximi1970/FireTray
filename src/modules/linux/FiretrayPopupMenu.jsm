/* -*- Mode: js2; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

var EXPORTED_SYMBOLS = [ "firetray" ];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
var { ctypes } = ChromeUtils.import("resource://gre/modules/ctypes.jsm");
Cu.import("resource://firetray/commons.js"); // first for Handler.app !
Cu.import("resource://firetray/ctypes/linux/gobject.jsm");
Cu.import("resource://firetray/ctypes/linux/"+firetray.Handler.app.widgetTk+"/gtk.jsm");
firetray.Handler.subscribeLibsForClosing([gobject, gtk]);

var { Logging } = ChromeUtils.import("resource://firetray/logging.jsm");
let log = Logging.getLogger("firetray.PopupMenu");

if ("undefined" == typeof(firetray.StatusIcon))
  log.error("This module MUST be imported from/after StatusIcon !");


firetray.PopupMenu = {
  MENU_ITEM_WINDOWS_POSITION: 4,

  initialized: false,
  callbacks: {menuItemWindowActivate: {}}, // FIXME: try to store them into a ctypes array/struct.
  menu: null,
  menuShell: null,
  menuSeparatorWindows: null,
  menuItem: {tip: null, showHide: null, activateLast: null, sep: null},

  init: function() {
    this.menu = gtk.gtk_menu_new();
    this.menuShell = ctypes.cast(this.menu, gtk.GtkMenuShell.ptr);
    var addMenuSeparator = false;

    if (firetray.Handler.inMailApp) {
      this.addItem({itemName:"ResetIcon", iconName:"gtk-apply",
                    action:"activate", callback: firetray.Handler.setIconImageDefault});
      this.addItem({itemName:"NewMessage", iconName:"gtk-edit",
                    action:"activate", callback: firetray.Handler.openMailMessage});
      addMenuSeparator = true;
    }

    if (firetray.Handler.inBrowserApp) {
      this.addItem({itemName:"NewWindow", iconName:"gtk-new",
                    action:"activate", callback: firetray.Handler.openBrowserWindow});
      addMenuSeparator = true;
    }

    var menuSeparator;
    if (addMenuSeparator) {
      menuSeparator = gtk.gtk_separator_menu_item_new();
      gtk.gtk_menu_shell_append(this.menuShell, ctypes.cast(menuSeparator,
                                                            gtk.GtkWidget.ptr));
    }

    this.addItem({itemName:"Preferences", iconName:"gtk-preferences",
                  action:"activate", callback: firetray.Handler.openPrefWindow});
    menuSeparator = gtk.gtk_separator_menu_item_new();
    gtk.gtk_menu_shell_append(this.menuShell, ctypes.cast(menuSeparator,
                                                          gtk.GtkWidget.ptr));

    this.addItem({itemName:"Quit", iconName:"gtk-quit",
                  action:"activate", callback: firetray.Handler.quitApplication});

    var menuWidget = ctypes.cast(this.menu, gtk.GtkWidget.ptr);
    gtk.gtk_widget_show_all(menuWidget);

    // for hidden windows, not shown otherwise
    this.menuSeparatorWindows = gtk.gtk_separator_menu_item_new();
    gtk.gtk_menu_shell_prepend(
      this.menuShell, ctypes.cast(this.menuSeparatorWindows, gtk.GtkWidget.ptr));
    // FIXME: we better use a submenu for this: gtk_menu_new(), gtk_menu_item_set_submenu();

    // for AppIndicator, not shown otherwise
    this.prependAppIndicatorItems();

    this.initialized = true;
    return true;
  },

  shutdown: function() {
    log.debug("Disabling PopupMenu");
    this.initialized = false;
  },

  /* FIXME: gtk3 "GtkImageMenuItem has been deprecated since GTK+ 3.10".
   GtkWidget *box = gtk_box_new (GTK_ORIENTATION_HORIZONTAL, 6);
   GtkWidget *icon = gtk_image_new_from_icon_name ("folder-music-symbolic", GTK_ICON_SIZE_MENU);
   GtkWidget *label = gtk_label_new ("Music");
   GtkWidget *menu_item = gtk_menu_item_new ();
   gtk_container_add (GTK_CONTAINER (box), icon);
   gtk_container_add (GTK_CONTAINER (box), label);
   gtk_container_add (GTK_CONTAINER (menu_item), box);
   gtk_widget_show_all (menu_item);
   */
  addItem: function(it) {
    // shouldn't need to convert to utf8 later thank to js-ctypes
    var menuItemLabel = firetray.Utils.strings
          .GetStringFromName("popupMenu.itemLabel."+it.itemName);
    var menuItem = gtk.gtk_image_menu_item_new_with_label(menuItemLabel);
    var menuItemIcon = gtk.gtk_image_new_from_stock(it.iconName, gtk.GTK_ICON_SIZE_MENU);
    gtk.gtk_image_menu_item_set_image(menuItem, menuItemIcon);
    var menuItemWidget = ctypes.cast(menuItem, gtk.GtkWidget.ptr);
    if (it.inFront)
      gtk.gtk_menu_shell_prepend(this.menuShell, menuItemWidget);
    else
      gtk.gtk_menu_shell_append(this.menuShell, menuItemWidget);

    function capitalizeFirst(str) {
      return str.charAt(0).toUpperCase() + str.substring(1);
    }

    let cbName = "menuItem"+capitalizeFirst(it.itemName)+capitalizeFirst(it.action);
    if (this.callbacks.hasOwnProperty(cbName))
      log.warn("callback '"+cbName+"' already registered");
    else
      log.debug("cbName="+cbName);
    this.callbacks[cbName] = gobject.GCallback_t(it.callback); // void return, no sentinel
    gobject.g_signal_connect(menuItem, it.action,
                             firetray.PopupMenu.callbacks[cbName], null);

    return menuItem;
  },

  prependAppIndicatorItems: function() {
    this.menuItem.sep = gtk.gtk_separator_menu_item_new();
    gtk.gtk_menu_shell_prepend(this.menuShell, ctypes.cast(this.menuItem.sep,
                                                           gtk.GtkWidget.ptr));

    this.menuItem.activateLast = this.addItem({
      itemName:"ActivateLast", iconName:null, action:"activate", callback:
      firetray.Handler.showAllWindowsAndActivate, inFront: true});

    this.menuItem.showHide = this.addItem({
      itemName:"ShowHide", iconName:"gtk-go-down", action:"activate", callback:
      firetray.Handler.showHideAllWindows, inFront: true});

    this.menuItem.tip = this.createAndAddItemToMenuAt(0);
    gtk.gtk_widget_set_sensitive(
      ctypes.cast(this.menuItem.tip, gtk.GtkWidget.ptr), false);
  },

  popup: function(icon, button, activateTime, menu) {
    log.debug("menu-popup");
    log.debug("ARGS="+icon+", "+button+", "+activateTime+", "+menu);

    var gtkMenuPtr = ctypes.cast(menu, gtk.GtkMenu.ptr);
    var iconGpointer = ctypes.cast(icon, gobject.gpointer);
    gtk.gtk_menu_popup(
      gtkMenuPtr, null, null, gtk.gtk_status_icon_position_menu,
      iconGpointer, button, activateTime);

    let stopPropagation = false;
    return stopPropagation;
  },

  // we'll be creating menuItems for windows (and not showing them) even if
  // hides_single_window is false, because if hides_single_window becomes true,
  // we'll just have to show the menuItems
  addWindowItem: function(xid) { // on registerWindow
    log.debug("addWindowItem");
    var menuItemWindow = this.createAndAddItemToMenuAt(
      this.MENU_ITEM_WINDOWS_POSITION);
    firetray.Handler.gtkPopupMenuWindowItems.insert(xid, menuItemWindow);
    this.setItemLabel(menuItemWindow, xid.toString()); // default to xid

    let callback = gobject.GCallback_t(
      function(){firetray.Handler.showWindow(xid);}); // void return, no sentinel
    this.callbacks.menuItemWindowActivate[xid] = callback,
    gobject.g_signal_connect(menuItemWindow, "activate", callback, null);

    log.debug("added gtkPopupMenuWindowItems: "+firetray.Handler.gtkPopupMenuWindowItems.count);
  },

  createAndAddItemToMenuAt: function(pos) {
    var menuItem = gtk.gtk_image_menu_item_new();
    gtk.gtk_menu_shell_insert(this.menuShell,
                              ctypes.cast(menuItem, gtk.GtkWidget.ptr),
                              pos);
    return menuItem;
  },

  removeWindowItem: function(xid) { // on unregisterWindow
    let menuItemWindow = firetray.Handler.gtkPopupMenuWindowItems.get(xid);
    firetray.Handler.gtkPopupMenuWindowItems.remove(xid);
    this.removeItem(menuItemWindow);
    log.debug("remove gtkPopupMenuWindowItems: "+firetray.Handler.gtkPopupMenuWindowItems.count);
  },
  removeItem: function(item) {
    gtk.gtk_widget_destroy(ctypes.cast(item, gtk.GtkWidget.ptr));
  },

  showAllWindowItemsOnlyVisibleWindows: function() {
    for (let xid in firetray.Handler.windows)
      if (!firetray.Handler.windows[xid].visible)
        this.showWindowItem(xid);
  },

  showWindowItem: function(xid) {
    if (!this.windowItemsHandled())
      return;

    log.debug("showWindowItem");
    let menuItemWindow = firetray.Handler.gtkPopupMenuWindowItems.get(xid);
    this.showItem(menuItemWindow);
    this.setItemLabel(menuItemWindow, firetray.Window.getWindowTitle(xid));
    this.showWindowSeparator();
  },

  showItem: function(menuItem) {
    gtk.gtk_widget_show(ctypes.cast(menuItem, gtk.GtkWidget.ptr));
  },

  setItemLabel: function(menuItem, label) {
    log.debug("about to set title: "+label);
    if (label)
      gtk.gtk_menu_item_set_label(ctypes.cast(menuItem, gtk.GtkMenuItem.ptr), label);
  },

  hideAllWindowItems: function() {
    for (let xid in firetray.Handler.windows)
      this.hideWindowItemAndSeparator(xid);
  },

  hideWindowItemAndSeparator: function(xid) {
    this.hideWindowItem(xid);
    this.hideWindowSeparator();
  },

  hideWindowItemAndSeparatorMaybe: function(xid) {
    if (!this.windowItemsHandled()) return;

    this.hideWindowItem(xid);
    if (firetray.Handler.visibleWindowsCount === firetray.Handler.windowsCount)
      this.hideWindowSeparator();
  },

  hideWindowItem: function(xid) {
    log.debug("hideWindowItem");
    let menuItemWindow = firetray.Handler.gtkPopupMenuWindowItems.get(xid);
    this.hideItem(menuItemWindow);
  },

  hideItem: function(menuItem) {
    gtk.gtk_widget_hide(ctypes.cast(menuItem, gtk.GtkWidget.ptr));
  },

  showWindowSeparator: function() {
    log.debug("showing menuSeparatorWindows");
    gtk.gtk_widget_show(ctypes.cast(this.menuSeparatorWindows, gtk.GtkWidget.ptr));
  },
  hideWindowSeparator: function() {
    log.debug("hiding menuSeparatorWindows");
    gtk.gtk_widget_hide(ctypes.cast(this.menuSeparatorWindows, gtk.GtkWidget.ptr));
  },

  showHideWindowItems: function() {
    if (this.windowItemsHandled())
      this.showAllWindowItemsOnlyVisibleWindows();
    else
      this.hideAllWindowItems();
  },

  windowItemsHandled: function() {
    return firetray.Utils.prefService.getBoolPref('hides_single_window');
  }

}; // firetray.PopupMenu

firetray.Handler.showHidePopupMenuItems =
  firetray.PopupMenu.showHideWindowItems.bind(firetray.PopupMenu);
