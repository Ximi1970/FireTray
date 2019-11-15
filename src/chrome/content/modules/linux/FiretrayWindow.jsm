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
var { gtk } = ChromeUtils.import("chrome://firetray/content/modules/ctypes/linux/"+FIRETRAY_GTK+"/gtk.jsm");
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

const FIRETRAY_XWINDOW_HIDDEN    = 1 << 0; // when minimized also
const FIRETRAY_XWINDOW_MAXIMIZED = 1 << 1;

firetray.Window = new FiretrayWindow();
firetray.Window.signals = {'focus-in': {callback: {}, handler: {}}};

firetray.Window.init = function() {
  log.debug("Init");
  let gtkVersionCheck = gtk.gtk_check_version(
    gtk.FIRETRAY_REQUIRED_GTK_MAJOR_VERSION,
    gtk.FIRETRAY_REQUIRED_GTK_MINOR_VERSION,
    gtk.FIRETRAY_REQUIRED_GTK_MICRO_VERSION
  );
  if (!gtkVersionCheck.isNull())
    log.error("gtk_check_version="+gtkVersionCheck.readString());

  this.initialized = true;
};

firetray.Window.shutdown = function() {
  this.initialized = false;
};
