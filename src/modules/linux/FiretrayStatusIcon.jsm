/* -*- Mode: js2; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

var EXPORTED_SYMBOLS = [ "firetray" ];
  
const Ci = Components.interfaces;
const Cu = Components.utils;

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { ctypes } = ChromeUtils.import("resource://gre/modules/ctypes.jsm");
var { firetray,
      FIRETRAY_GTK
    } = ChromeUtils.import("resource://firetray/commons.js"); // first for Handler.app !
var { gdk } = ChromeUtils.import("resource://firetray/ctypes/linux/"+FIRETRAY_GTK+"/gdk.jsm");
var { gio } = ChromeUtils.import("resource://firetray/ctypes/linux/gio.jsm");
var { glib } = ChromeUtils.import("resource://firetray/ctypes/linux/glib.jsm");
var { gobject, glib } = ChromeUtils.import("resource://firetray/ctypes/linux/gobject.jsm");
var { libc } = ChromeUtils.import("resource://firetray/ctypes/linux/libc.jsm");
var { x11 } = ChromeUtils.import("resource://firetray/ctypes/linux/x11.jsm");
var { appind } = ChromeUtils.import("resource://firetray/ctypes/linux/"+FIRETRAY_GTK+"/appindicator.jsm");
//MR firetray.Handler.subscribeLibsForClosing([gdk, gio, glib, gobject]);

var { Logging } = ChromeUtils.import("resource://firetray/logging.jsm");
let log = Logging.getLogger("firetray.StatusIcon");

const getDesktop = function() {
  let env = Cc["@mozilla.org/process/environment;1"]
        .createInstance(Ci.nsIEnvironment);
  let XDG_CURRENT_DESKTOP = env.get("XDG_CURRENT_DESKTOP").toLowerCase();
  let DESKTOP_SESSION = env.get("DESKTOP_SESSION").toLowerCase();

  let desktop = {name:'unknown', ver:null};
  if (XDG_CURRENT_DESKTOP === 'unity' || DESKTOP_SESSION === 'ubuntu') {
    desktop.name = 'unity';
  }
  // can't test DESKTOP_SESSION for kde: kde-plasma, plasme, kf5, ...
  else if (XDG_CURRENT_DESKTOP === 'kde') {
    desktop.name = 'kde';
    let KDE_SESSION_VERSION = env.get("KDE_SESSION_VERSION");
    if (KDE_SESSION_VERSION)
      desktop.ver = parseInt(KDE_SESSION_VERSION, 10);
  }
  else if (DESKTOP_SESSION) {
    desktop.name = DESKTOP_SESSION;
  }
  else if (XDG_CURRENT_DESKTOP) {
    desktop.name = XDG_CURRENT_DESKTOP;
  }

  return desktop;
};

const dbusNotificationWatcherReady = function() {
  let watcherReady = false;

  function error(e) {
    if (!e.isNull()) {
      log.error(e.contents.message);
      glib.g_error_free(e);
    }
  }

  let conn = new gio.GDBusConnection.ptr;
  let err = new glib.GError.ptr(null);
  conn = gio.g_bus_get_sync(gio.G_BUS_TYPE_SESSION, null, err.address());
  if (error(err)) return watcherReady;

  if (!conn.isNull()) {
    let flags = gio.G_DBUS_PROXY_FLAGS_DO_NOT_AUTO_START |
          gio.G_DBUS_PROXY_FLAGS_DO_NOT_LOAD_PROPERTIES |
          gio.G_DBUS_PROXY_FLAGS_DO_NOT_CONNECT_SIGNALS;

    let proxy = gio.g_dbus_proxy_new_for_bus_sync(
      gio.G_BUS_TYPE_SESSION,
      flags,
      null, /* GDBusInterfaceInfo */
      appind.NOTIFICATION_WATCHER_DBUS_ADDR,
      appind.NOTIFICATION_WATCHER_DBUS_OBJ,
      appind.NOTIFICATION_WATCHER_DBUS_IFACE,
      null, /* GCancellable */
      err.address());
    if (error(err)) return watcherReady;

    if (!proxy.isNull()) {
      let owner = gio.g_dbus_proxy_get_name_owner(proxy);
      if (!owner.isNull()) {
        watcherReady = true;
      }
      gobject.g_object_unref(proxy);
    }

    gobject.g_object_unref(conn);
  }

  return watcherReady;
};

const canAppind = (appind.available() && dbusNotificationWatcherReady());

const appindEnable = function() {
  let desktop = getDesktop();
  log.info("desktop="+JSON.stringify(desktop));
  let isAppindDesktop = (desktop.name === 'unity' ||
                          (desktop.name === 'kde' && desktop.ver > 4));
  if (isAppindDesktop && !appind.available()) {
    log.error("Missing libappindicator for "+firetray.Handler.app.widgetTk);
    return false;
  }

  return (firetray.Utils.prefService.getBoolPref('with_appindicator') &&
          canAppind && isAppindDesktop);
};
  
if (appindEnable()) {
  var { firetray } = ChromeUtils.import("resource://firetray/linux/FiretrayAppIndicator.jsm");
} else {
  var { firetray } = ChromeUtils.import("resource://firetray/linux/FiretrayGtkStatusIcon.jsm");
}

var { firetray } = ChromeUtils.import("resource://firetray/linux/FiretrayPopupMenu.jsm");

firetray.StatusIcon = {
  initialized: false,
  callbacks: {}, // pointers to JS functions. MUST LIVE DURING ALL THE EXECUTION
  prefAppIconNames: null,
  prefNewMailIconNames: null,
  defaultAppIconName: null,
  defaultNewMailIconName: null,
  canAppind: canAppind,
  appindEnable: appindEnable(),

  initImpl: function() {
    if (this.appindEnable) {
      return firetray.AppIndicator.init();
    } else {
      return firetray.GtkStatusIcon.init();
    }
  },
  
  shutdownImpl: function() {
    if (this.appindEnable) {
      firetray.AppIndicator.shutdown();
    } else {
      firetray.GtkStatusIcon.shutdown();
    }
  },
  
  init: function() {
    log.debug("Init");

    this.defineIconNames();

    // PopupMenu g_connect's some Handler functions. As these are overridden is
    // StatusIcon implementations, PopupMenu must be initialized *after*
    // implemenations are imported.
    if (!firetray.PopupMenu.init())
      return false;

    if (!this.initImpl())
      return false;

    this.initialized = true;
    log.debug("Init Done");
    return true;
  },

  shutdown: function() {
    log.debug("Shutdown");
    
    this.shutdownImpl();
    firetray.PopupMenu.shutdown();
    
    this.initialized = false;
    log.debug("Shutdown Done");
  },
    
  defineIconNames: function() {
    this.prefAppIconNames = (function() {
      if (firetray.Handler.inMailApp) {
        return "app_mail_icon_names";
      } else if (firetray.Handler.inBrowserApp) {
        return "app_browser_icon_names";
      } else {
        return "app_default_icon_names";
      }
    })();
    this.defaultAppIconName = firetray.Handler.app.name.toLowerCase();

    this.prefNewMailIconNames = "new_mail_icon_names";
    this.defaultNewMailIconName = "mail-unread";
  },

  getAppIconNames: function() {
    let appIconNames = firetray.Utils.getArrayPref(
      firetray.StatusIcon.prefAppIconNames);
    appIconNames.push(firetray.StatusIcon.defaultAppIconName);
    return appIconNames;
  },
  getNewMailIconNames: function() {
    let newMailIconNames = firetray.Utils.getArrayPref(
      firetray.StatusIcon.prefNewMailIconNames);
    newMailIconNames.push(firetray.StatusIcon.defaultNewMailIconName);
    return newMailIconNames;
  },

  onScroll: function(direction) {
    if (!firetray.Utils.prefService.getBoolPref("scroll_hides"))
      return false;

    let scroll_mode = firetray.Utils.prefService.getCharPref("scroll_mode");
    switch(direction) {
    case gdk.GDK_SCROLL_UP:
      log.debug("SCROLL UP");
      if (scroll_mode === "down_hides")
        firetray.Handler.showAllWindows();
      else if (scroll_mode === "up_hides")
        firetray.Handler.hideAllWindows();
      break;
    case gdk.GDK_SCROLL_DOWN:
      log.debug("SCROLL DOWN");
      if (scroll_mode === "down_hides")
        firetray.Handler.hideAllWindows();
      else if (scroll_mode === "up_hides")
        firetray.Handler.showAllWindows();
      break;
    case gdk.GDK_SCROLL_SMOOTH:
      // ignore
      break;
    default:
      log.error("SCROLL UNKNOWN");
    }

    return true;
  },

  // Interface

  loadIcons: function() {
    if (this.appindEnable) {
      firetray.AppIndicator.loadIcons();
    } else {
      firetray.GtkStatusIcon.loadIcons();      
    }
  },

  loadImageCustom:  function(prefname) {},

  setIconImageDefault: function() {
    if (this.appindEnable) {
      firetray.AppIndicator.setIconImageDefault();
    } else {
      firetray.GtkStatusIcon.setIconImageDefault();      
    }
  },

  setIconImageBlank: function() {
    if (this.appindEnable) {
      firetray.AppIndicator.setIconImageBlank();
    } else {
      firetray.GtkStatusIcon.setIconImageBlank();      
    }
  },

  setIconImageNewMail: function() {
    if (this.appindEnable) {
      firetray.AppIndicator.setIconImageNewMail();
    } else {
      firetray.GtkStatusIcon.setIconImageNewMail();      
    }
  },

  setIconImageCustom: function(prefname) {
    if (this.appindEnable) {
      firetray.AppIndicator.setIconImageCustom(prefname);
    } else {
      firetray.GtkStatusIcon.setIconImageCustom(prefname);      
    }
  },

  setIconTooltipDefault: function() {
    if (!firetray.Handler.app.name)
      throw "application name not initialized";
    this.setIconTooltip(firetray.Handler.app.name);
  },

  setIconTooltip: function(toolTipStr) {
    if (this.appindEnable) {
      firetray.AppIndicator.setIconTooltip(toolTipStr);
    } else {
      firetray.GtkStatusIcon.setIconTooltip(toolTipStr);      
    }    
  },

  setIconTooltip: function(toolTipStr) {
    if (this.appindEnable) {
      firetray.AppIndicator.setIconTooltip(toolTipStr);
    } else {
      firetray.GtkStatusIcon.setIconTooltip(toolTipStr);      
    }    
  },

  setIconText: function(text, color) {
    if (this.appindEnable) {
      firetray.AppIndicator.setIconText(text, color);
    } else {
      firetray.GtkStatusIcon.setIconText(text, color);      
    }    
  },

  setIconVisibility: function(visible) {
    if (this.appindEnable) {
      firetray.AppIndicator.setIconVisibility(visible);
    } else {
      firetray.GtkStatusIcon.setIconVisibility(visible);      
    }    
  },

}; // firetray.StatusIcon
