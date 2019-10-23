/* -*- Mode: js2; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

/* GdkWindow and GtkWindow are totally different things. A GtkWindow is a
 "standalone" window. A GdkWindow is just a region on the screen that can
 capture events and has certain attributes (such as a cursor, and a coordinate
 system). Basically a GdkWindow is an X window, in the Xlib sense, and
 GtkWindow is a widget used for a particular UI effect.
 (http://mail.gnome.org/archives/gtk-app-devel-list/1999-January/msg00138.html) */

var EXPORTED_SYMBOLS = [ "firetray" ];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
var { ctypes } = ChromeUtils.import("resource://gre/modules/ctypes.jsm");
Cu.import("resource://firetray/commons.js"); // first for Handler.app !
Cu.import("resource://firetray/ctypes/ctypesMap.jsm");
Cu.import("resource://firetray/ctypes/linux/gobject.jsm");
Cu.import("resource://firetray/ctypes/linux/"+firetray.Handler.app.widgetTk+"/gdk.jsm");
Cu.import("resource://firetray/ctypes/linux/"+firetray.Handler.app.widgetTk+"/gtk.jsm");
Cu.import("resource://firetray/ctypes/linux/libc.jsm");
Cu.import("resource://firetray/ctypes/linux/x11.jsm");
Cu.import("resource://firetray/FiretrayWindow.jsm");
firetray.Handler.subscribeLibsForClosing([gobject, gdk, gtk, libc, x11, glib]);

var { Logging } = ChromeUtils.import("resource://firetray/logging.jsm");
let log = Logging.getLogger("firetray.Window");

if ("undefined" == typeof(firetray.Handler))
  log.error("This module MUST be imported from/after FiretrayHandler !");

const Services2 = {};
XPCOMUtils.defineLazyServiceGetter(
  Services2,
  "uuid",
  "@mozilla.org/uuid-generator;1",
  "nsIUUIDGenerator"
);

const FIRETRAY_XWINDOW_HIDDEN    = 1 << 0; // when minimized also
const FIRETRAY_XWINDOW_MAXIMIZED = 1 << 1;

/**
 * custum type used to pass data in to and out of findGtkWindowByTitleCb
 */
var _find_data_t = ctypes.StructType("_find_data_t", [
  { inTitle: ctypes.char.ptr },
  { outWindow: gtk.GtkWindow.ptr }
]);

// NOTE: storing ctypes pointers into a JS object doesn't work: pointers are
// "evolving" after a while (maybe due to back and forth conversion). So we
// need to store them into a real ctypes array !
firetray.Handler.gtkWindows              = new ctypesMap(gtk.GtkWindow.ptr);
firetray.Handler.gdkWindows              = new ctypesMap(gdk.GdkWindow.ptr);
firetray.Handler.gtkPopupMenuWindowItems = new ctypesMap(gtk.GtkImageMenuItem.ptr);


firetray.Window = new FiretrayWindow();
firetray.Window.signals = {'focus-in': {callback: {}, handler: {}}};

firetray.Window.init = function() {
  let gtkVersionCheck = gtk.gtk_check_version(
    gtk.FIRETRAY_REQUIRED_GTK_MAJOR_VERSION,
    gtk.FIRETRAY_REQUIRED_GTK_MINOR_VERSION,
    gtk.FIRETRAY_REQUIRED_GTK_MICRO_VERSION
  );
  if (!gtkVersionCheck.isNull())
    log.error("gtk_check_version="+gtkVersionCheck.readString());

  if (firetray.Handler.isChatEnabled()) {
    Cu.import("resource://firetray/linux/FiretrayChat.jsm");
    Cu.import("resource://firetray/linux/FiretrayChatStatusIcon.jsm");
  }

  this.initialized = true;
};

firetray.Window.shutdown = function() {
  this.initialized = false;
};

/**
 * Iterate over all Gtk toplevel windows to find a window. We rely on
 * Service.wm to watch windows correctly: we should find only one window.
 *
 * @author Nils Maier (stolen from MiniTrayR), himself inspired by Windows docs
 * @param window nsIDOMWindow from Services.wm
 * @return a gtk.GtkWindow.ptr
 */
firetray.Window.getGtkWindowFromChromeWindow = function(window) {
  let baseWindow = window
        .QueryInterface(Ci.nsIInterfaceRequestor)
        .getInterface(Ci.nsIWebNavigation)
        .QueryInterface(Ci.nsIBaseWindow);

  // Tag the base window
  let oldTitle = baseWindow.title;
  log.debug("oldTitle="+oldTitle);
  baseWindow.title = Services2.uuid.generateUUID().toString();

  try {
    // Search the window by the *temporary* title
    let widgets = gtk.gtk_window_list_toplevels();
    let that = this;
    let findGtkWindowByTitleCb = gobject.GFunc_t(that._findGtkWindowByTitle); // void return, no sentinel
    var userData = new _find_data_t(
      ctypes.char.array()(baseWindow.title),
      null
    ).address();
    log.debug("userData="+userData);
    gobject.g_list_foreach(widgets, findGtkWindowByTitleCb, userData);
    gobject.g_list_free(widgets);

    if (userData.contents.outWindow.isNull())
      throw new Error("Window not found!");

    log.debug("found window: "+userData.contents.outWindow);
  } catch (x) {
    log.error(x);
  } finally {
    // Restore
    baseWindow.title = oldTitle;
  }

  return userData.contents.outWindow;
};

/**
 * compares a GtkWindow's title with a string passed in userData
 * @param gtkWidget: GtkWidget from gtk_window_list_toplevels()
 * @param userData: _find_data_t
 */
firetray.Window._findGtkWindowByTitle = function(gtkWidget, userData) {
  let data = ctypes.cast(userData, _find_data_t.ptr);
  let inTitle = data.contents.inTitle;

  let gtkWin = ctypes.cast(gtkWidget, gtk.GtkWindow.ptr);
  let winTitle = gtk.gtk_window_get_title(gtkWin);

  if (!winTitle.isNull()) {
    log.debug(inTitle+" = "+winTitle);
    if (libc.strcmp(inTitle, winTitle) == 0)
      data.contents.outWindow = gtkWin;
  }
};

firetray.Window.getGdkWindowFromGtkWindow = function(gtkWin) {
  try {
    let gtkWid = ctypes.cast(gtkWin, gtk.GtkWidget.ptr);
    return gtk.gtk_widget_get_window(gtkWid);
  } catch (x) {
    log.error(x);
  }
  return null;
};

if (firetray.Handler.app.widgetTk == "gtk2") {

  firetray.Window.getXIDFromGdkWindow = function(gdkWin) {
    return gdk.gdk_x11_drawable_get_xid(ctypes.cast(gdkWin, gdk.GdkDrawable.ptr));
  };

  firetray.Window.getXIDFromGtkWidget = function(gtkWid) {
    let gdkWin = gtk.gtk_widget_get_window(gtkWid);
    return gdk.gdk_x11_drawable_get_xid(ctypes.cast(gdkWin, gdk.GdkDrawable.ptr));
  };

}
else if (firetray.Handler.app.widgetTk == "gtk3") {

  firetray.Window.getXIDFromGdkWindow = function(gdkWin) {
    return gdk.gdk_x11_window_get_xid(gdkWin);
  };

  firetray.Window.getXIDFromGtkWidget = function(gtkWid) {
    let gdkWin = gtk.gtk_widget_get_window(gtkWid);
    return gdk.gdk_x11_window_get_xid(gdkWin);
  };

}
else {
  log.error("Unhandled widgetTk: "+firetray.Handler.app.widgetTk);
}

firetray.Window.addrPointedByInHex = function(ptr) {
  return "0x"+ctypes.cast(ptr, ctypes.uintptr_t.ptr).contents.toString(16);
};

firetray.Window.getGdkWindowFromNativeHandle = function(nativeHandle) {
  let gdkw = new gdk.GdkWindow.ptr(ctypes.UInt64(nativeHandle)); // a new pointer to the GdkWindow
  gdkw = gdk.gdk_window_get_toplevel(gdkw);
  log.debug("gdkw="+gdkw+" *gdkw="+this.addrPointedByInHex(gdkw));
  return gdkw;
};

firetray.Window.getGtkWindowFromGdkWindow = function(gdkWin) {
  let gptr = new gobject.gpointer;
  gdk.gdk_window_get_user_data(gdkWin, gptr.address());
  log.debug("gptr="+gptr+" *gptr="+this.addrPointedByInHex(gptr));
  let gtkw = ctypes.cast(gptr, gtk.GtkWindow.ptr);
  log.debug("gtkw="+gtkw+" *gtkw="+this.addrPointedByInHex(gtkw));
  return gtkw;
};

/* consider using getRegisteredWinIdFromChromeWindow() if you only need the XID */
firetray.Window.getWindowsFromChromeWindow = function(win) {
  let baseWin = firetray.Handler.getWindowInterface(win, "nsIBaseWindow");
  let nativeHandle = baseWin.nativeHandle; // Moz' private pointer to the GdkWindow
  log.debug("nativeHandle="+nativeHandle);
  let gtkWin;
  let gdkWin;
  if (nativeHandle) { // Gecko 17+
    gdkWin = firetray.Window.getGdkWindowFromNativeHandle(nativeHandle);
    gtkWin = firetray.Window.getGtkWindowFromGdkWindow(gdkWin);
  } else {
    gtkWin = firetray.Window.getGtkWindowFromChromeWindow(win);
    gdkWin = firetray.Window.getGdkWindowFromGtkWindow(gtkWin);
  }
  let xid = firetray.Window.getXIDFromGdkWindow(gdkWin);
  log.debug("XID="+xid);
  return [baseWin, gtkWin, gdkWin, xid];
};

firetray.Window.unregisterWindowByXID = function(xid) {
  if (!firetray.Handler.windows.hasOwnProperty(xid)) {
    log.error("can't unregister unknown window "+xid);
    return false;
  }

  firetray.Window.detachOnFocusInCallback(xid);
  if (firetray.Handler.isChatEnabled() && firetray.Chat.initialized) {
    firetray.Chat.detachSelectListeners(firetray.Handler.windows[xid].chromeWin);
  }

  if (!delete firetray.Handler.windows[xid])
    throw new DeleteError();
  firetray.Handler.gtkWindows.remove(xid);
  firetray.Handler.gdkWindows.remove(xid);

  firetray.PopupMenu.removeWindowItem(xid);

  log.debug("window "+xid+" unregistered");
  return true;
};

firetray.Window.show = function(xid) {
  log.debug("show xid="+xid);

  // try to restore previous state. TODO: z-order respected ?
  firetray.Window.restorePositionAndSize(xid);
  firetray.Window.restoreStates(xid);

  // better visual effect if visibility set after restorePosition, but some
  // WMs like compiz seem not to honor position setting if window not visible
  firetray.Window.setVisibility(xid, true);

  // after show
  firetray.Window.restoreDesktop(xid);
  if (firetray.Utils.prefService.getBoolPref('show_activates'))
    firetray.Window.activate(xid);

  firetray.PopupMenu.hideWindowItemAndSeparatorMaybe(xid);
  firetray.Handler.showHideIcon();
};

/* FIXME: hiding windows should also hide child windows, like message windows
 in Thunderbird */
firetray.Window.hide = function(xid) {
  log.debug("hide");

  firetray.Window.savePositionAndSize(xid);
  firetray.Window.saveStates(xid);
  firetray.Window.saveDesktop(xid);

  firetray.Window.setVisibility(xid, false);

  firetray.PopupMenu.showWindowItem(xid);
  firetray.Handler.showHideIcon();
};

firetray.Window.startupHide = function(xid) {
  log.debug('startupHide: '+xid);

  // also it seems cleaner, baseWin.visibility=false removes the possibility
  // to restore the app by calling it from the command line. Not sure why...
  firetray.Window.setVisibility(xid, false);

  firetray.PopupMenu.showWindowItem(xid);
  firetray.Handler.showHideIcon();
};

firetray.Window.savePositionAndSize = function(xid) {
  let gx = {}, gy = {}, gwidth = {}, gheight = {};
  firetray.Handler.windows[xid].baseWin.getPositionAndSize(gx, gy, gwidth, gheight);
  firetray.Handler.windows[xid].savedX = gx.value;
  firetray.Handler.windows[xid].savedY = gy.value;
  firetray.Handler.windows[xid].savedWidth = gwidth.value;
  firetray.Handler.windows[xid].savedHeight = gheight.value;
  log.debug("save: gx="+gx.value+", gy="+gy.value+", gwidth="+gwidth.value+", gheight="+gheight.value);
};

firetray.Window.restorePositionAndSize = function(xid) {
  if ("undefined" === typeof(firetray.Handler.windows[xid].savedX))
    return; // windows[xid].saved* may not be initialized

  log.debug("restore: x="+firetray.Handler.windows[xid].savedX+", y="+firetray.Handler.windows[xid].savedY+", w="+firetray.Handler.windows[xid].savedWidth+", h="+firetray.Handler.windows[xid].savedHeight);
  firetray.Handler.windows[xid].baseWin.setPositionAndSize(
    firetray.Handler.windows[xid].savedX,
    firetray.Handler.windows[xid].savedY,
    firetray.Handler.windows[xid].savedWidth,
    firetray.Handler.windows[xid].savedHeight,
    false); // repaint

  ['savedX', 'savedX', 'savedWidth', 'savedHeight'].forEach(function(element) {
    delete firetray.Handler.windows[xid][element];
  });
};

firetray.Window.saveStates = function(xid) {
  let winStates = firetray.Window.getXWindowStates(x11.Window(xid));
  firetray.Handler.windows[xid].savedStates = winStates;
  log.debug("save: windowStates="+winStates);
};

// NOTE: fluxbox bug probably: if hidden and restored iconified, then
// switching to desktop de-iconifies it ?!
firetray.Window.restoreStates = function(xid) {
  let winStates = firetray.Handler.windows[xid].savedStates;
  log.debug("restored WindowStates: " + winStates);

  if (winStates & FIRETRAY_XWINDOW_HIDDEN) {
    firetray.Handler.windows[xid].chromeWin.minimize();
    log.debug("restored minimized");
  }

  /* we expect the WM to actually show the window *not* minimized once
   restored */
  if (firetray.Utils.prefService.getBoolPref('hides_on_minimize'))
    // help prevent getting iconify event following show()
    firetray.Handler.windows[xid].chromeWin.restore(); // nsIDOMChromeWindow.idl

  if (winStates & FIRETRAY_XWINDOW_MAXIMIZED) {
    firetray.Handler.windows[xid].chromeWin.maximize();
    log.debug("restored maximized");
  }

  delete firetray.Handler.windows[xid].savedStates;
};

firetray.Window.saveDesktop = function(xid) {
  if (!firetray.Utils.prefService.getBoolPref('remember_desktop'))
    return;

  let winDesktop = firetray.Window.getXWindowDesktop(x11.Window(xid));
  firetray.Handler.windows[xid].savedDesktop = winDesktop;
  log.debug("save: windowDesktop="+winDesktop);
};

firetray.Window.restoreDesktop = function(xid) {
  if (!firetray.Utils.prefService.getBoolPref('remember_desktop'))
    return;

  let desktopDest = firetray.Handler.windows[xid].savedDesktop;
  if (desktopDest === null || "undefined" === typeof(desktopDest)) return;

  let dataSize = 1;
  let data = ctypes.long(dataSize);
  data[0] = desktopDest;
  this.xSendClientMessgeEvent(xid, x11.current.Atoms._NET_WM_DESKTOP, data, dataSize);

  log.debug("restored to desktop: "+desktopDest);
  delete firetray.Handler.windows[xid].savedDesktop;
};

firetray.Window.getVisibility = function(xid) {
  let gtkWidget = ctypes.cast(firetray.Handler.gtkWindows.get(xid), gtk.GtkWidget.ptr);
  // nsIBaseWin.visibility always true
  return gtk.gtk_widget_get_visible(gtkWidget);
};

firetray.Window.setVisibility = function(xid, visibility) {
  log.debug("setVisibility="+visibility);
  let gtkWidget = ctypes.cast(firetray.Handler.gtkWindows.get(xid), gtk.GtkWidget.ptr);
  if (visibility)
    gtk.gtk_widget_show_all(gtkWidget);
  else
    gtk.gtk_widget_hide(gtkWidget);
};

firetray.Window.xSendClientMessgeEvent = function(xid, atom, data, dataSize) {
  let xev = new x11.XClientMessageEvent;
  xev.type = x11.ClientMessage;
  xev.window = x11.Window(xid);
  xev.message_type = atom;
  xev.format = 32;
  for (let i=0; i<dataSize; ++i)
    xev.data[i] = data[i];

  let rootWin = x11.XDefaultRootWindow(x11.current.Display);
  let propagate = false;
  let mask = ctypes.long(x11.SubstructureNotifyMask|x11.SubstructureRedirectMask);
  // fortunately, it's OK not to cast xev. ctypes.cast to a void_t doesn't work (length pb)
  let status = x11.XSendEvent(x11.current.Display, rootWin, propagate, mask, xev.address());
  // always returns 1 (BadRequest as a coincidence)
};

/**
 * raises window on top and give focus.
 */
firetray.Window.activate = function(xid) {
  // broken in KDE ?
  gtk.gtk_window_present(firetray.Handler.gtkWindows.get(xid));
  log.debug("window raised");
};

firetray.Window.setUrgency = function(xid, urgent) {
  log.debug("setUrgency: "+urgent);
  gtk.gtk_window_set_urgency_hint(firetray.Handler.gtkWindows.get(xid), urgent);
};

/**
 * YOU MUST x11.XFree() THE VARIABLE RETURNED BY THIS FUNCTION
 * @param xwin: a x11.Window
 * @param prop: a x11.Atom
 */
firetray.Window.getXWindowProperties = function(xwin, prop) {
  // infos returned by XGetWindowProperty() - FIXME: should be freed ?
  let actual_type = new x11.Atom;
  let actual_format = new ctypes.int;
  let nitems = new ctypes.unsigned_long;
  let bytes_after = new ctypes.unsigned_long;
  let prop_value = new ctypes.unsigned_char.ptr;

  let bufSize = XATOMS_EWMH_WM_STATES.length*ctypes.unsigned_long.size;
  let offset = 0;
  let res = x11.XGetWindowProperty(
    x11.current.Display, xwin, prop, offset, bufSize, 0, x11.AnyPropertyType,
    actual_type.address(), actual_format.address(), nitems.address(),
    bytes_after.address(), prop_value.address());
  log.debug("XGetWindowProperty res="+res+", actual_type="+actual_type.value+", actual_format="+actual_format.value+", bytes_after="+bytes_after.value+", nitems="+nitems.value);

  if (!firetray.js.strEquals(res, x11.Success)) {
    log.error("XGetWindowProperty failed");
    return [null, null];
  }
  if (firetray.js.strEquals(actual_type.value, x11.None)) {
    log.debug("property not found");
    return [null, null];
  }

  log.debug("prop_value="+prop_value+", size="+prop_value.constructor.size);
  /* If the returned format is 32, the property data will be stored as an
   array of longs (which in a 64-bit application will be 64-bit values
   that are padded in the upper 4 bytes). [man XGetWindowProperty] */
  if (actual_format.value !== 32) {
    log.error("unsupported format: "+actual_format.value);
  }
  log.debug("format OK");
  var props = ctypes.cast(prop_value, ctypes.unsigned_long.array(nitems.value).ptr);
  log.debug("props="+props+", size="+props.constructor.size);

  return [props, nitems];
};

/**
 * check the state of a window by its EWMH window state. This is more
 * accurate than the chromeWin.windowState or the GdkWindowState which are
 * based on WM_STATE. For instance, WM_STATE becomes 'Iconic' on virtual
 * desktop change...
 */
firetray.Window.getXWindowStates = function(xwin) {
  let winStates = 0;

  let [propsFound, nitems] =
        firetray.Window.getXWindowProperties(xwin, x11.current.Atoms._NET_WM_STATE);
  log.debug("propsFound, nitems="+propsFound+", "+nitems);
  if (!propsFound) return 0;

  let maximizedHorz = false;
  let maximizedVert = false;
  for (let i=0, len=nitems.value; i<len; ++i) {
    log.debug("i: "+propsFound.contents[i]);
    let currentProp = propsFound.contents[i];
    if (firetray.js.strEquals(currentProp, x11.current.Atoms['_NET_WM_STATE_HIDDEN']))
      winStates |= FIRETRAY_XWINDOW_HIDDEN;
    else if (firetray.js.strEquals(currentProp, x11.current.Atoms['_NET_WM_STATE_MAXIMIZED_HORZ']))
      maximizedHorz = true;
    else if (firetray.js.strEquals(currentProp, x11.current.Atoms['_NET_WM_STATE_MAXIMIZED_VERT']))
      maximizedVert = true;
  }

  if (maximizedHorz && maximizedVert)
    winStates |= FIRETRAY_XWINDOW_MAXIMIZED;

  x11.XFree(propsFound);

  return winStates;
};

firetray.Window.getXWindowDesktop = function(xwin) {
  let desktop = null;

  let [propsFound, nitems] =
        firetray.Window.getXWindowProperties(xwin, x11.current.Atoms._NET_WM_DESKTOP);
  log.debug("DESKTOP propsFound, nitems="+propsFound+", "+nitems);
  if (!propsFound) return null;

  if (firetray.js.strEquals(nitems.value, 0))
    log.warn("desktop number not found");
  else if (firetray.js.strEquals(nitems.value, 1))
    desktop = propsFound.contents[0];
  else
    throw new RangeError("more than one desktop found");

  x11.XFree(propsFound);

  return desktop;
};

firetray.Window.correctSubscribedEventMasks = function(gdkWin) {
  let eventMask = gdk.gdk_window_get_events(gdkWin);
  let eventMaskNeeded = gdk.GDK_STRUCTURE_MASK | gdk.GDK_PROPERTY_CHANGE_MASK |
        gdk.GDK_VISIBILITY_NOTIFY_MASK;
  log.debug("eventMask="+eventMask+" eventMaskNeeded="+eventMaskNeeded);
  if ((eventMask & eventMaskNeeded) !== eventMaskNeeded) {
    log.info("subscribing window to missing mandatory event-masks");
    gdk.gdk_window_set_events(gdkWin, eventMask|eventMaskNeeded);
  }
};

firetray.Window.filterWindow = function(xev, gdkEv, data) {
  if (!xev)
    return gdk.GDK_FILTER_CONTINUE;

  let xany = ctypes.cast(xev, x11.XAnyEvent.ptr);
  let xid = xany.contents.window;

  switch (xany.contents.type) {

  case x11.MapNotify:
    log.debug("MapNotify");
    let gdkWinStateOnMap = gdk.gdk_window_get_state(firetray.Handler.gdkWindows.get(xid));
    log.debug("gdkWinState="+gdkWinStateOnMap+" for xid="+xid);
    let win = firetray.Handler.windows[xid];
    if (firetray.Handler.appStarted && !win.visible) {
      // when app hidden at startup, then called from command line without
      // any argument (not through FireTray that is)
      log.warn("window not visible, correcting visibility");
      log.debug("visibleWindowsCount="+firetray.Handler.visibleWindowsCount);
    }
    break;

  case x11.UnmapNotify:       // for catching 'iconify'
    log.debug("UnmapNotify");

    let winStates = firetray.Window.getXWindowStates(xid);
    let isHidden =  winStates & FIRETRAY_XWINDOW_HIDDEN;
    log.debug("winStates="+winStates+", isHidden="+isHidden);
    // NOTE: Gecko 8.0 provides the 'sizemodechange' event, which comes once
    // the window is minimized. i.e. preventDefault() or returning false won't
    // prevent the event.
    if (isHidden) {
      log.debug("GOT ICONIFIED");
      firetray.Handler.onMinimize(xid);
    }
    break;

    // default:
    //   log.debug("xany.type="+xany.contents.type);
    //   break;
  }

  return gdk.GDK_FILTER_CONTINUE;
};

firetray.Window.startupFilter = function(xev, gdkEv, data) {
  if (!xev)
    return gdk.GDK_FILTER_CONTINUE;

  let xany = ctypes.cast(xev, x11.XAnyEvent.ptr);
  let xid = xany.contents.window;

  // MapRequest already taken by window manager. Not sure we could be notified
  // *before* the window is actually mapped, in order to minimize it before
  // it's shown.
  if (xany.contents.type === x11.MapNotify) {
    gdk.gdk_window_remove_filter(firetray.Handler.gdkWindows.get(xid),
                                 firetray.Handler.windows[xid].startupFilterCb, null);
    if (firetray.Utils.prefService.getBoolPref('start_hidden')) {
      log.debug("start_hidden");
      firetray.Window.startupHide(xid);
    }
  }

  return gdk.GDK_FILTER_CONTINUE;
};

firetray.Window.showAllWindowsAndActivate = function() {
  let visibilityRate = firetray.Handler.visibleWindowsCount/firetray.Handler.windowsCount;
  log.debug("visibilityRate="+visibilityRate);
  if (visibilityRate < 1)
    firetray.Handler.showAllWindows();

  for(var key in firetray.Handler.windows); // FIXME: this is not the proper way for finding the last registered window !
  firetray.Window.activate(key);
};

firetray.Window.attachOnFocusInCallback = function(xid) {
  log.debug("attachOnFocusInCallback xid="+xid);
  let callback = gtk.GCallbackWidgetFocusEvent_t(
    firetray.Window.onFocusIn, null, FIRETRAY_CB_SENTINEL);
  this.signals['focus-in'].callback[xid] = callback;
  let handlerId = gobject.g_signal_connect(
    firetray.Handler.gtkWindows.get(xid), "focus-in-event", callback, null);
  log.debug("focus-in handler="+handlerId);
  this.signals['focus-in'].handler[xid] = handlerId;
};

firetray.Window.detachOnFocusInCallback = function(xid) {
  log.debug("detachOnFocusInCallback xid="+xid);
  let gtkWin = firetray.Handler.gtkWindows.get(xid);
  gobject.g_signal_handler_disconnect(
    gtkWin,
    gobject.gulong(this.signals['focus-in'].handler[xid])
  );
  delete this.signals['focus-in'].callback[xid];
  delete this.signals['focus-in'].handler[xid];
};

// NOTE: fluxbox issues a FocusIn event when switching workspace
// by hotkey, which means 2 FocusIn events when switching to a moz app :(
// (http://sourceforge.net/tracker/index.php?func=detail&aid=3190205&group_id=35398&atid=413960)
firetray.Window.onFocusIn = function(widget, event, data) {
  log.debug("onFocusIn");
  let xid = firetray.Window.getXIDFromGtkWidget(widget);
  log.debug("xid="+xid);

  firetray.Window.setUrgency(xid, false);

  if (firetray.Handler.isChatEnabled() && firetray.Chat.initialized) {
    firetray.Chat.stopGetAttentionMaybe(xid);
  }

  let stopPropagation = false;
  return stopPropagation;
};


///////////////////////// firetray.Handler overriding /////////////////////////

/** debug facility */
firetray.Handler.dumpWindows = function() {
  log.debug(firetray.Handler.windowsCount);
  for (let winId in firetray.Handler.windows) log.info(winId+"="+firetray.Handler.gtkWindows.get(winId));
};

firetray.Handler.registerWindow = function(win) {
  log.debug("register window");

  // register
  let [baseWin, gtkWin, gdkWin, xid] = firetray.Window.getWindowsFromChromeWindow(win);
  this.windows[xid] = {};
  this.windows[xid].chromeWin = win;
  this.windows[xid].baseWin = baseWin;
  Object.defineProperties(this.windows[xid], {
    "visible": { get: function(){return firetray.Window.getVisibility(xid);} }
  });
  firetray.Window.correctSubscribedEventMasks(gdkWin);
  try {
    this.gtkWindows.insert(xid, gtkWin);
    this.gdkWindows.insert(xid, gdkWin);
    firetray.PopupMenu.addWindowItem(xid);
  } catch (x) {
    if (x.name === "RangeError") // instanceof not working :-(
      win.alert(x+"\n\nYou seem to have more than "+FIRETRAY_WINDOW_COUNT_MAX
                +" windows open. This breaks FireTray and most probably "
                +firetray.Handler.app.name+".");
  }
  log.debug("window "+xid+" registered");
  // NOTE: shouldn't be necessary to gtk_widget_add_events(gtkWin, gdk.GDK_ALL_EVENTS_MASK);

  try {
     // NOTE: we could try to catch the "delete-event" here and block
     // delete_event_cb (in gtk2/nsWindow.cpp), but we prefer to use the
     // provided 'close' JS event

    this.windows[xid].filterWindowCb = gdk.GdkFilterFunc_t(
      firetray.Window.filterWindow, null, FIRETRAY_CB_SENTINEL);
    gdk.gdk_window_add_filter(gdkWin, this.windows[xid].filterWindowCb, null);
    if (!firetray.Handler.appStarted) {
      this.windows[xid].startupFilterCb = gdk.GdkFilterFunc_t(
        firetray.Window.startupFilter, null, FIRETRAY_CB_SENTINEL);
      gdk.gdk_window_add_filter(gdkWin, this.windows[xid].startupFilterCb, null);
    }

    firetray.Window.attachOnFocusInCallback(xid);
    if (firetray.Handler.isChatEnabled() && firetray.Chat.initialized) {
      firetray.Chat.attachSelectListeners(win);
    }

  } catch (x) {
    log.error(x);
    firetray.Window.unregisterWindowByXID(xid);
    return null;
  }

  log.debug("AFTER"); firetray.Handler.dumpWindows();
  return xid;
};

firetray.Handler.unregisterWindow = function(win) {
  log.debug("unregister window");
  let xid = firetray.Window.getRegisteredWinIdFromChromeWindow(win);
  return firetray.Window.unregisterWindowByXID(xid);
};

firetray.Handler.showWindow = firetray.Window.show;
firetray.Handler.hideWindow = firetray.Window.hide;

firetray.Handler.showAllWindowsAndActivate = firetray.Window.showAllWindowsAndActivate;

/* NOTE: gtk_window_is_active() not reliable, and _NET_ACTIVE_WINDOW may not
   always be set before 'focus-in-event' (gnome-shell/mutter 3.4.1). */
firetray.Handler.getActiveWindow = function() {
  let gdkActiveWin = gdk.gdk_screen_get_active_window(gdk.gdk_screen_get_default()); // inspects _NET_ACTIVE_WINDOW
  log.debug("gdkActiveWin="+gdkActiveWin);
  if (firetray.js.strEquals(gdkActiveWin, 'GdkWindow.ptr(ctypes.UInt64("0x0"))'))
    return null;
  let activeWin = firetray.Window.getXIDFromGdkWindow(gdkActiveWin);
  log.debug("ACTIVE_WINDOW="+activeWin);
  return activeWin;
};

firetray.Handler.windowGetAttention = function(winId) {
  firetray.Window.setUrgency(winId, true);
};


/**
 * init X11 Display and handled XAtoms.
 * Needs to be defined and called outside x11.jsm because: 1. gdk already
 * imports x11, 2. there is no means to get the default Display solely with
 * Xlib without opening one... :-(
 */
x11.init = function() {
  if (!firetray.js.isEmpty(this.current))
    return true; // init only once

  this.current = {};
  try {
    let gdkDisplay = gdk.gdk_display_get_default();
    this.current.Display = gdk.gdk_x11_display_get_xdisplay(gdkDisplay);
    this.current.Atoms = {};
    XATOMS.forEach(function(atomName, index, array) {
      this.current.Atoms[atomName] = x11.XInternAtom(this.current.Display, atomName, 0);
      log.debug("x11.current.Atoms."+atomName+"="+this.current.Atoms[atomName]);
    }, this);
    return true;
  } catch (x) {
    log.error(x);
    return false;
  }
};
x11.init();
