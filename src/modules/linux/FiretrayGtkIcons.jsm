/* -*- Mode: js2; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

var EXPORTED_SYMBOLS = [ "firetray" ];

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { firetray } = ChromeUtils.import("resource://firetray/commons.js"); // first for Handler.app !
var { gtk } = ChromeUtils.import("resource://firetray/ctypes/linux/"+Services.appinfo.widgetToolkit+"/gtk.jsm");
var { glib } = ChromeUtils.import("resource://firetray/ctypes/linux/glib.jsm");
var { gobject, glib } = ChromeUtils.import("resource://firetray/ctypes/linux/gobject.jsm");

//MR firetray.Handler.subscribeLibsForClosing([gtk]);

var { Logging } = ChromeUtils.import("resource://firetray/logging.jsm");
let log = Logging.getLogger("firetray.GtkIcons");

/* //MR
if ("undefined" == typeof(firetray.StatusIcon))
  log.error("This module MUST be imported from/after StatusIcon !");
*/

firetray.GtkIcons = {
  initialized: false,

  init: function() {
    try {
      if (this.initialized) return true;

      this.appendSearchPath();
      this.initialized = true;
      return true;
    } catch (x) {
      log.error(x);
      return false;
    }
  },

  shutdown: function() {
    // FIXME: XXX destroy icon here
    this.initialized = false;
  },

  appendSearchPath: function() {
    let gtkIconTheme = gtk.gtk_icon_theme_get_default();
    log.debug("gtkIconTheme="+gtkIconTheme);

    if (log.level <= Logging.LogMod.Level.Debug) {
      firetray.Handler.subscribeLibsForClosing([glib, gobject]);
      let path = new gobject.gchar.ptr.ptr;
      let n_elements = new gobject.gint;
      gtk.gtk_icon_theme_get_search_path(gtkIconTheme, path.address(), n_elements.address());
      log.debug("n_elements="+n_elements+" path="+path);
      let pathIt = path;
      for (let i=0, len=n_elements.value; i<len || pathIt.isNull(); ++i) {
        log.debug("path["+i+"]="+pathIt.contents.readString());
        pathIt = pathIt.increment();
      }
      log.debug("path="+path+" pathIt="+pathIt);
      glib.g_strfreev(path);
    }
  }

};
