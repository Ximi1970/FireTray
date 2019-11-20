/* GdkWindow and GtkWindow are totally different things. A GtkWindow is a
 "standalone" window. A GdkWindow is just a region on the screen that can
 capture events and has certain attributes (such as a cursor, and a coordinate
 system). Basically a GdkWindow is an X window, in the Xlib sense, and
 GtkWindow is a widget used for a particular UI effect.
 (http://mail.gnome.org/archives/gtk-app-devel-list/1999-January/msg00138.html) */

var EXPORTED_SYMBOLS = [ "firetray" ];

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
var { firetray,
      FIRETRAY_GTK,
      FIRETRAY_CB_SENTINEL
    } = ChromeUtils.import("chrome://firetray/content/modules/commons.jsm");
//var { gtk } = ChromeUtils.import("chrome://firetray/content/modules/ctypes/linux/"+FIRETRAY_GTK+"/gtk.jsm");
var { FiretrayWindow } = ChromeUtils.import("chrome://firetray/content/modules/FiretrayWindow.jsm");

var { Logging } = ChromeUtils.import("chrome://firetray/content/modules/logging.jsm");
let log = Logging.getLogger("firetray.Window");

const Services2 = {};
XPCOMUtils.defineLazyServiceGetter(
  Services2,
  "uuid",
  "@mozilla.org/uuid-generator;1",
  "nsIUUIDGenerator"
);


var { ctypes } = ChromeUtils.import("resource://gre/modules/ctypes.jsm");


var x11 = {};

x11.XID = ctypes.unsigned_long;



var gobject = {};

gobject.gobject = ctypes.open("libgobject-2.0.so.0");

gobject.gpointer = ctypes.voidptr_t;
gobject.gchar = ctypes.char;
gobject.gint = ctypes.int;
gobject.guint = ctypes.unsigned_int;
gobject.GFunc = ctypes.void_t.ptr;
gobject.GList = ctypes.StructType("GList");
gobject.GFunc_t = ctypes.FunctionType(ctypes.default_abi, ctypes.void_t, [gobject.gpointer, gobject.gpointer]).ptr;

gobject.g_list_foreach = gobject.gobject.declare("g_list_foreach", ctypes.default_abi, ctypes.void_t, gobject.GList.ptr, gobject.GFunc, gobject.gpointer);

gobject.g_list_free = gobject.gobject.declare("g_list_free", ctypes.default_abi, ctypes.void_t, gobject.GList.ptr);



var gdk = {};

gdk.gdk = ctypes.open("libgdk-3.so.0");

gdk.GdkWindow = ctypes.StructType("GdkWindow");

gdk.gdk_window_get_toplevel = gdk.gdk.declare("gdk_window_get_toplevel", ctypes.default_abi, gdk.GdkWindow.ptr, gdk.GdkWindow.ptr);
gdk.gdk_window_get_user_data = gdk.gdk.declare("gdk_window_get_user_data", ctypes.default_abi, ctypes.void_t, gdk.GdkWindow.ptr, gobject.gpointer.ptr);
gdk.gdk_x11_window_get_xid = gdk.gdk.declare("gdk_x11_window_get_xid", ctypes.default_abi, x11.XID, gdk.GdkWindow.ptr);





var gtk = {};

gtk.gtk = ctypes.open("libgtk-3.so.0");

gtk.GtkWindow = ctypes.StructType("GtkWindow");

gtk.GtkStyle = ctypes.StructType("GtkStyle");
gtk.GtkRequisition = ctypes.StructType("GtkRequisition", [
  { width: gobject.gint },
  { height: gobject.gint }
]);
gtk.GtkAllocation = ctypes.StructType("GtkAllocation", [
  { x: gobject.gint },
  { y: gobject.gint },
  { width: gobject.gint },
  { height: gobject.gint }
]);
gtk.GtkWidget = ctypes.StructType("GtkWidget");
gtk.GtkWidget.define([
  { "style": gtk.GtkStyle.ptr },
  { "requisition": gtk.GtkRequisition },
  { "allocation": gtk.GtkAllocation },
  { "window": gdk.GdkWindow.ptr },
  { "parent": gtk.GtkWidget.ptr }
]);

gtk.gtk_check_version = gtk.gtk.declare("gtk_check_version", ctypes.default_abi, gobject.gchar.ptr, gobject.guint, gobject.guint, gobject.guint); 
gtk.gtk_window_list_toplevels = gtk.gtk.declare("gtk_window_list_toplevels", ctypes.default_abi, gobject.GList.ptr);
gtk.gtk_window_get_title = gtk.gtk.declare("gtk_window_get_title", ctypes.default_abi, gobject.gchar.ptr, gtk.GtkWindow.ptr);
gtk.gtk_widget_get_window = gtk.gtk.declare("gtk_widget_get_window", ctypes.default_abi, gdk.GdkWindow.ptr, gtk.GtkWidget.ptr);








const FIRETRAY_XWINDOW_HIDDEN    = 1 << 0; // when minimized also
const FIRETRAY_XWINDOW_MAXIMIZED = 1 << 1;

/**
 * custum type used to pass data in to and out of findGtkWindowByTitleCb
 */
var _find_data_t = ctypes.StructType("_find_data_t", [
  { inTitle: ctypes.char.ptr },
  { outWindow: gtk.GtkWindow.ptr }
]);

firetray.Window = new FiretrayWindow();
firetray.Window.signals = {'focus-in': {callback: {}, handler: {}}};

firetray.Window.init = function() {
  log.debug("Init");

  let gtkVersionCheck = gtk.gtk_check_version(3, 4, 0);
  if (!gtkVersionCheck.isNull())
    log.error("gtk_check_version="+gtkVersionCheck.readString());

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

firetray.Window.getXIDFromGdkWindow = function(gdkWin) {
  return gdk.gdk_x11_window_get_xid(gdkWin);
};

firetray.Window.getXIDFromGtkWidget = function(gtkWid) {
  let gdkWin = gtk.gtk_widget_get_window(gtkWid);
  return gdk.gdk_x11_window_get_xid(gdkWin);
};





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




///////////////////////// firetray.Handler overriding /////////////////////////



firetray.Window.registerWindow = function(win) {
  log.debug("register window");

  // register
  let [baseWin, gtkWin, gdkWin, xid] = firetray.Window.getWindowsFromChromeWindow(win);
  firetray.Handler.windows[xid] = {};
  firetray.Handler.windows[xid].chromeWin = win;
  firetray.Handler.windows[xid].baseWin = baseWin;

  
  return xid;
};
