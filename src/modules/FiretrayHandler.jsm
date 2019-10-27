/* -*- Mode: js2; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
"use strict";

var EXPORTED_SYMBOLS = [ "firetray" ];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { ctypes } = ChromeUtils.import("resource://gre/modules/ctypes.jsm");
var { firetray,
      FIRETRAY_PREF_BRANCH,
      FIRETRAY_OS_SUPPORT,
      FIRETRAY_APP_DB,
      FIRETRAY_ACCOUNT_SERVER_TYPE_IM,
      FIRETRAY_DELAY_STARTUP_MILLISECONDS,
      FIRETRAY_DELAY_NOWAIT_MILLISECONDS
    } = ChromeUtils.import("resource://firetray/commons.js");
var { PrefListener } = ChromeUtils.import("resource://firetray/PrefListener.jsm");

/**
 * firetray namespace.
 */
if ("undefined" == typeof(firetray)) {
  var firetray = {};
};

var { Logging } = ChromeUtils.import("resource://firetray/logging.jsm");
let log = Logging.getLogger("firetray.Handler");

var { firetray } = ChromeUtils.import("resource://firetray/"+Services.appinfo.OS.toLowerCase()+"/FiretrayStatusIcon.jsm");
log.debug("FiretrayStatusIcon "+Services.appinfo.OS.toLowerCase()+" imported");
log.info("useAppind="+firetray.StatusIcon.appindEnable());
var { firetray } = ChromeUtils.import("resource://firetray/"+Services.appinfo.OS.toLowerCase()+"/FiretrayWindow.jsm");
log.debug("FiretrayWindow "+Services.appinfo.OS.toLowerCase()+" imported");

var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
var { firetray } = ChromeUtils.import("resource://firetray/FiretrayMessaging.jsm");
var { firetray } = ChromeUtils.import("resource://firetray/"+Services.appinfo.OS.toLowerCase()+"/FiretrayChat.jsm");
var { IOUtils } = ChromeUtils.import("resource:///modules/IOUtils.js");
 
/**
 * Singleton object and abstraction for windows and tray icon management.
 */
// NOTE: modules work outside of the window scope. Unlike scripts in the
// chrome, modules don't have access to objects such as window, document, or
// other global functions
// (https://developer.mozilla.org/en/XUL_School/JavaScript_Object_Management)
firetray.Handler = {

  initialized: false,
  timers: {},
  inBrowserApp: false,
  inMailApp: false,
  appHasChat: false,
  appStarted: false,
  useAppind: firetray.StatusIcon.appindEnable(),
  canAppind: firetray.StatusIcon.canAppind,
  windows: {},
  get windowsCount() {return Object.keys(this.windows).length;},
  get visibleWindowsCount() {
    let count = 0;
    for (let wid in firetray.Handler.windows) {
      if (firetray.Handler.windows[wid].visible) count += 1;
    }
    return count;
  },
  observedTopics: {},
  ctypesLibs: {},               // {"lib1": lib1, "lib2": lib2}

  app: (function(){return {
    id: Services.appinfo.ID,
    name: Services.appinfo.name,
    // Services.vc.compare(version,"2.0a")>=0
    version: Services.appinfo.platformVersion,
    ABI: Services.appinfo.XPCOMABI,
    OS: Services.appinfo.OS.toLowerCase(), // "WINNT", "Linux", "Darwin"
    widgetTk: Services.appinfo.widgetToolkit,
  };})(),
  support: {chat: false, winnt: false},

  init: function() {            // does creates icon
    log.debug("Init");
    
    firetray.PrefListener.register(false);
    firetray.MailChatPrefListener.register(false);

    log.info("OS=" + this.app.OS +
             ", ABI=" + this.app.ABI +
             ", platformVersion=" + this.app.version +
             ", widgetToolkit=" + this.app.widgetTk);
    if (FIRETRAY_OS_SUPPORT.indexOf(this.app.OS) < 0) {
      let platforms = FIRETRAY_OS_SUPPORT.join(", ");
      log.error("Only "+platforms+" platform(s) supported at this time. Firetray not loaded");
      return false;
    } else if (this.app.OS == "winnt" &&
               Services.vc.compare(this.app.version,"27.0") < 0) {
      log.error("FireTray needs Gecko 27 and above on Windows.");
      return false;
    } else if (this.app.OS == "freebsd") {
      this.app.OS = "linux";
    }

/*
    var { firetray } = ChromeUtils.import("resource://firetray/"+this.app.OS+"/FiretrayStatusIcon.jsm");
    log.debug("FiretrayStatusIcon "+this.app.OS+" imported");
    log.info("useAppind="+firetray.Handler.useAppind);
    var { firetray } = ChromeUtils.import("resource://firetray/"+this.app.OS+"/FiretrayWindow.jsm");
    log.debug("FiretrayWindow "+this.app.OS+" imported");
*/

    this.support['chat']  =
      ['linux'].indexOf(this.app.OS) > -1 && !this.useAppind;
    this.support['winnt'] =
      ['winnt'].indexOf(firetray.Handler.app.OS) > -1;

    if (this.app.id === FIRETRAY_APP_DB['thunderbird']['id'] ||
        this.app.id === FIRETRAY_APP_DB['seamonkey']['id'])
      this.inMailApp = true;
    if (this.app.id === FIRETRAY_APP_DB['firefox']['id'] ||
        this.app.id === FIRETRAY_APP_DB['seamonkey']['id'])
      this.inBrowserApp = true;
    if (this.app.id === FIRETRAY_APP_DB['thunderbird']['id'] &&
        Services.vc.compare(this.app.version,"15.0")>=0)
      this.appHasChat = true;
    log.info('inMailApp='+this.inMailApp+', inBrowserApp='+this.inBrowserApp+
      ', appHasChat='+this.appHasChat);

    firetray.Window.init();
    firetray.StatusIcon.init();
    firetray.Handler.showHideIcon();
    log.debug('StatusIcon initialized');

    if (this.inMailApp) {
      try {
//MR        Cu.import("resource:///modules/MailServices.jsm");
//MR        Cu.import("resource://firetray/FiretrayMessaging.jsm");
        if (firetray.Utils.prefService.getBoolPref("mail_notification_enabled")) {
          firetray.Messaging.init();
          firetray.Messaging.updateMsgCountWithCb();
        }
      } catch (x) {
        log.error(x);
        return false;
      }
    }

    let chatIsProvided = this.isChatProvided();
    log.info('isChatProvided='+chatIsProvided);
    if (chatIsProvided) {
      if (this.support['chat']) {
//MR        Cu.import("resource://firetray/FiretrayMessaging.jsm"); // needed for existsChatAccount
//MR        Cu.import("resource://firetray/"+this.app.OS+"/FiretrayChat.jsm");
        firetray.Utils.addObservers(firetray.Handler, [
          "account-added", "account-removed"]);
        if (firetray.Utils.prefService.getBoolPref("chat_icon_enable") &&
            this.existsChatAccount())
          firetray.Chat.init();
      } else {
        log.warn("Chat not supported for this environment. Chat not loaded");
      }
    }

    firetray.Utils.addObservers(firetray.Handler,
      [ "xpcom-will-shutdown", "profile-change-teardown" ]);
    if (this.app.id === FIRETRAY_APP_DB['firefox']['id'] ||
        this.app.id === FIRETRAY_APP_DB['seamonkey']['id']) {
      firetray.Utils.addObservers(firetray.Handler, [ "sessionstore-windows-restored" ]);
    } else if (this.app.id === FIRETRAY_APP_DB['thunderbird']['id']) {
      this.restoredWindowsCount = this.readTBRestoreWindowsCount();
      log.info("restoredWindowsCount="+this.restoredWindowsCount);
      if (!this.restoredWindowsCount) {
        log.warn("session file could not be read");
        this.restoredWindowsCount = 1; // default
      }
      firetray.Utils.addObservers(firetray.Handler, [ "mail-startup-done" ]);
    } else {
      firetray.Utils.addObservers(firetray.Handler, [ "final-ui-startup" ]);
    }

    this.disablePrefsTmp();

    this.initialized = true;
    log.debug("Init Done");
    return true;
  },

  shutdown: function() {
    log.debug("Disabling Handler");
    if (firetray.Handler.isChatProvided() && firetray.Handler.support['chat']
        && firetray.Chat.initialized)
      firetray.Chat.shutdown();

    if (this.inMailApp)
      firetray.Messaging.shutdown();
    firetray.StatusIcon.shutdown();
    firetray.Window.shutdown();
    this.tryCloseLibs();

    firetray.Utils.removeAllObservers(this);

    firetray.MailChatPrefListener.unregister(false);
    firetray.PrefListener.unregister();

    this.appStarted = false;
    this.initialized = false;
    return true;
  },

  isChatEnabled: function() {
    return this.isChatProvided() &&
      firetray.Utils.prefService.getBoolPref("chat_icon_enable");
  },

  isChatProvided: function() {
    return this.appHasChat && Services.prefs.getBoolPref("mail.chat.enabled");
  },

  subscribeLibsForClosing: function(libs) {
    for (let i=0, len=libs.length; i<len; ++i) {
      let lib = libs[i];
      if (!this.ctypesLibs.hasOwnProperty(lib.name))
        this.ctypesLibs[lib.name] = lib;
    }
  },

  tryCloseLibs: function() {
    try {
      for (let libName in this.ctypesLibs) {
        let lib = this.ctypesLibs[libName];
        if (lib.available())
          lib.close();
      };
    } catch(x) { log.error(x); }
  },

  readTBRestoreWindowsCount: function() {
//MR    Cu.import("resource:///modules/IOUtils.js");
    let sessionFile = Services.dirsvc.get("ProfD", Ci.nsIFile);
    sessionFile.append("session.json");
    var initialState = null;
    if (sessionFile.exists()) {
      let data = IOUtils.loadFileToString(sessionFile);
      if (!data) return null;
      try {
        initialState = JSON.parse(data);
      } catch(x) {}
      if (!initialState) return null;

      return  initialState.windows.length;
    }
    return null;
  },

  // FIXME: this should definetely be done in Chat, but IM accounts
  // seem not be initialized at early stage (Exception... "'TypeError:
  // this._items is undefined' when calling method:
  // [nsISimpleEnumerator::hasMoreElements]"), and we're unsure if we should
  // initAccounts() ourselves...
  existsChatAccount: function() {
    let accounts = firetray.Messaging.Accounts();
    for (let accountServer of accounts)
      if (accountServer.type === FIRETRAY_ACCOUNT_SERVER_TYPE_IM)  {
        log.debug("found im server: "+accountServer.prettyName);
        return true;
      }

    return false;
  },

  startupDone: function() {
    firetray.Handler.timers['startup-done'] =
      firetray.Utils.timer(FIRETRAY_DELAY_STARTUP_MILLISECONDS,
        Ci.nsITimer.TYPE_ONE_SHOT, function() {
          firetray.Handler.appStarted = true;
          log.info("*** appStarted ***");

          if (firetray.Handler.inMailApp) {
            firetray.Messaging.addPrefObserver();
          }
        });
  },

  observe: function(subject, topic, data) {
    switch (topic) {

    case "sessionstore-windows-restored":
      // sessionstore-windows-restored does not come after the realization of
      // all windows... so we wait a little
    case "final-ui-startup":    // subject=ChromeWindow
      log.debug(topic+": "+subject+","+data);
      firetray.Utils.removeObservers(firetray.Handler, [ topic ]);
      firetray.Handler.startupDone();
      break;

    case "mail-startup-done": // or xul-window-visible, mail-tabs-session-restored ?
      log.debug(topic+": "+subject+","+data);
      if (firetray.Handler.restoredWindowsCount &&
          !--firetray.Handler.restoredWindowsCount) {
        firetray.Utils.removeObservers(firetray.Handler, [ topic ]);
        firetray.Handler.startupDone();
      }
      break;

    case "xpcom-will-shutdown":
      log.debug("xpcom-will-shutdown");
      this.shutdown();
      break;
    case "profile-change-teardown": // also found "quit-application-granted"
      if (data === 'shutdown-persist')
        this.restorePrefsTmp();
      break;

    case "account-removed":     // emitted by IM
      if (!this.existsChatAccount())
        firetray.Handler.toggleChat(false);
      break;
    case "account-added":       // emitted by IM
      if (!firetray.Chat.initialized)
        firetray.Handler.toggleChat(true);
      break;

    default:
      log.warn("unhandled topic: "+topic);
    }
  },

  toggleChat: function(enabled) {
    log.debug("Chat icon enable="+enabled);

    if (enabled) {
      firetray.Chat.init();
      for (let winId in firetray.Handler.windows) {
        firetray.Chat.attachSelectListeners(firetray.Handler.windows[winId].chromeWin);
      }

    } else {
      for (let winId in firetray.Handler.windows) {
        firetray.Chat.detachSelectListeners(firetray.Handler.windows[winId].chromeWin);
      }
      firetray.Chat.shutdown();
    }
  },

  // Interface

  loadIcons: function() {
    firetray.StatusIcon.loadIcons();
  },

  loadImageCustom: function(prefname) {
    firetray.StatusIcon.loadImageCustom(prefname);
  },

  setIconImageDefault: function() {
    firetray.StatusIcon.setIconImageDefault();
  },

  setIconImageBlank: function() {
    firetray.StatusIcon.setIconImageBlank();
  },

  setIconImageNewMail: function() {
    firetray.StatusIcon.setIconImageNewMail();
  },

  setIconImageCustom: function(prefname) {
    firewall.StatusIcon.setIconImageCustom(prefname);
  },
  
  setIconTooltipDefault: function() {
    firetray.StatusIcon.setIconTooltipDefault();
  },

  setIconTooltip: function(localizedMessage) {
    firetray.StatusIcon.setIconTooltip(localizedMessage);
  },
  
  setIconText: function(text, color) {
    firetray.StatusIcon.setIconText(text, color);
  },
  
  setIconVisibility: function(visible) {
    firetray.StatusIcon.setIconVisibility(visible);
  },
  

  // these get overridden in OS-specific Icon/Window handlers

  
  dumpWindows: function() {
    firetray.Window.dumpWindows();
  },
  registerWindow: function(win) {
        firetray.Window.registerWindow(win);
  },
  unregisterWindow: function(win) {
        firetray.Window.unregisterWindow(win);
  },
  hideWindow: function(winId) {
    firetray.Window.hideWindow(winId);
  },
  showWindow: function(winId) {
    firetray.Window.showWindow(winId);
  },
  showAllWindowsAndActivate: firetray.Window.showAllWindowsAndActivate, // linux
  getActiveWindow: function() {
    firetray.Window.getActiveWindow();
  },
  windowGetAttention: function(winId) {
    firetray.Windows.windowGetAttention(winId);
  },
  showHidePopupMenuItems: function() {}, // linux
  addPopupWindowItemAndSeparatorMaybe: function(wid) {}, // winnt
  removePopupWindowItemAndSeparatorMaybe: function(wid) {}, // winnt

  showAllWindows: function() {
    log.debug("showAllWindows");
    for (let winId in firetray.Handler.windows) {
      if (!firetray.Handler.windows[winId].visible)
        firetray.Handler.showWindow(winId);
    }
  },
  hideAllWindows: function() {
    log.debug("hideAllWindows");
    for (let winId in firetray.Handler.windows) {
      if (firetray.Handler.windows[winId].visible)
        firetray.Handler.hideWindow(winId);
    }
  },

  showHideAllWindows: function() {
    log.debug("showHideAllWindows");
    log.debug("  visibleWindowsCount="+firetray.Handler.visibleWindowsCount+" / windowsCount="+firetray.Handler.windowsCount);
    let visibilityRate = firetray.Handler.visibleWindowsCount /
          firetray.Handler.windowsCount;
    log.debug("  visibilityRate="+visibilityRate);
    if ((0.5 < visibilityRate) && (visibilityRate < 1)
        || visibilityRate === 0) { // TODO: should be configurable
      firetray.Handler.showAllWindows();
    } else {
      firetray.Handler.hideAllWindows();
    }
  },

  onMinimize: function(wid) {
    log.debug("onMinimize");
    let hidden = false;
    if (firetray.Utils.prefService.getBoolPref('hides_on_minimize')) {
      if (firetray.Utils.prefService.getBoolPref('hides_single_window'))
        firetray.Handler.hideWindow(wid);
      else
        firetray.Handler.hideAllWindows();
      hidden = true;
    }
    return hidden;
  },

  showHideIcon: function(msgCount) {
    let allWindowsVisible = true;
    if (firetray.Utils.prefService.getBoolPref('show_icon_on_hide')) {
      allWindowsVisible =
        (firetray.Handler.visibleWindowsCount !== firetray.Handler.windowsCount);
    }

    let msgCountPositive = true;
    if (firetray.Utils.prefService.getBoolPref('nomail_hides_icon') &&
        ("undefined" !== typeof(msgCount))) {
      msgCountPositive = (msgCount > 0);
      log.info("__msgCountPositive="+msgCountPositive);
    }

    log.debug("allWindowsVisible="+allWindowsVisible+" msgCountPositive="+msgCountPositive);
    firetray.Handler.setIconVisibility(allWindowsVisible && msgCountPositive);
  },

  /** nsIBaseWindow, nsIXULWindow, ... */
  getWindowInterface: function(win, iface) {
    let winInterface;
    let winOut;
    try {                       // thx Neil Deakin !!
      winInterface =  win.QueryInterface(Ci.nsIInterfaceRequestor)
        .getInterface(Ci.nsIWebNavigation)
        .QueryInterface(Ci.nsIDocShellTreeItem)
        .treeOwner
        .QueryInterface(Ci.nsIInterfaceRequestor);
    } catch (ex) {
      // ignore no-interface exception
      log.error(ex);
      return null;
    }

    if (iface == "nsIBaseWindow")
      winOut = winInterface[iface];
    else if (iface == "nsIXULWindow")
      winOut = winInterface.getInterface(Ci.nsIXULWindow);
    else {
      log.error("unknown iface '" + iface + "'");
      return null;
    }

    return winOut;
  },

  _getBrowserProperties: function() {
    if (firetray.Handler.app.id === FIRETRAY_APP_DB['firefox']['id'])
      return "chrome://branding/locale/browserconfig.properties";
    else if (firetray.Handler.app.id === FIRETRAY_APP_DB['seamonkey']['id'])
      return "chrome://navigator-region/locale/region.properties";
    else return null;
  },

  _getHomePage: function() {
    var prefDomain = "browser.startup.homepage";
    var url;
    try {
      url = Services.prefs.getComplexValue(prefDomain,
        Components.interfaces.nsIPrefLocalizedString).data;
    } catch (e) {}

    if (url) {
      try {
        Services.io.newURI(url, null, null);
      } catch (e) {
        url = "http://" + url;
      }
    }
    else {
      var configBundle = Services.strings.createBundle(firetray.Handler._getBrowserProperties());
      url = configBundle.GetStringFromName(prefDomain);
    }

    return url;
  },

  openPrefWindow: function() {
    if (null == firetray.Handler._preferencesWindow ||
        firetray.Handler._preferencesWindow.closed) {
      for(var first in firetray.Handler.windows) break;
      firetray.Handler._preferencesWindow =
        firetray.Handler.windows[first].chromeWin.openDialog(
          "chrome://firetray/content/options.xul", null,
          "chrome,titlebar,toolbar,centerscreen", null);
    }

    firetray.Handler._preferencesWindow.focus();
  },

  openBrowserWindow: function() {
    try {
      var home = firetray.Handler._getHomePage();
      log.debug("home="+home);

      // FIXME: obviously we need to wait to avoid seg fault on jsapi.cpp:827
      // 827         if (t->data.requestDepth) {
      firetray.Handler.timers['open-browser-window'] =
        firetray.Utils.timer(FIRETRAY_DELAY_NOWAIT_MILLISECONDS,
          Ci.nsITimer.TYPE_ONE_SHOT, function() {
            for(var first in firetray.Handler.windows) break;
            firetray.Handler.windows[first].chromeWin.open(home);
          });
    } catch (x) { log.error(x); }
  },

  openMailMessage: function() {
    try {
      var aURI = Services.io.newURI("mailto:", null, null);
      MailServices.compose.OpenComposeWindowWithURI(null, aURI);
    } catch (x) { log.error(x); }
  },

  quitApplication: function() {
    try {
      firetray.Handler.timers['quit-application'] =
        firetray.Utils.timer(FIRETRAY_DELAY_NOWAIT_MILLISECONDS,
          Ci.nsITimer.TYPE_ONE_SHOT, function() {
            let appStartup = Cc['@mozilla.org/toolkit/app-startup;1']
                  .getService(Ci.nsIAppStartup);
            appStartup.quit(Ci.nsIAppStartup.eAttemptQuit);
          });
    } catch (x) { log.error(x); }
  },

  prefsDisable: [
    {cond: function(){return firetray.Handler.inBrowserApp;},
     branch: "browser.tabs.", pref: "warnOnClose", bak:null},
    {cond: function(){return firetray.Handler.inMailApp;},
     branch: "mail.biff.", pref: "show_tray_icon", bak:null}
  ],
  disablePrefsTmp: function() {
    this.prefsDisable.forEach(function(pref){
      if (!pref.cond()) return;
      try {
        let branch = Services.prefs.getBranch(pref.branch);
        pref.bak = branch.getBoolPref(pref.pref);
        log.debug(pref.pref+" saved. was: "+pref.bak);
        branch.setBoolPref(pref.pref, false);
      } catch(x) {}
    });
  },
  restorePrefsTmp: function() {
    this.prefsDisable.forEach(function(pref){
      if (!pref.cond() || !pref.bak) return;
      let branch = Services.prefs.getBranch(pref.branch);
      branch.setBoolPref(pref.pref, pref.bak);
      log.debug(pref.pref+" restored to: "+pref.bak);
    });
  },

  excludeOtherShowIconPrefs: function(prefName) {
    if (prefName !== 'nomail_hides_icon')
      firetray.Utils.prefService.setBoolPref('nomail_hides_icon', false);
    if (prefName !== 'show_icon_on_hide')
      firetray.Utils.prefService.setBoolPref('show_icon_on_hide', false);
  },
  
}; // firetray.Handler


// FIXME: since prefs can also be changed from config editor, we need to
// 1. observe *all* firetray prefs, and 2. change options' UI accordingly !
firetray.PrefListener = new PrefListener(
  FIRETRAY_PREF_BRANCH,
  function(branch, name) {
    log.debug('____Pref changed: '+name);
    switch (name) {
    case 'hides_single_window':
      firetray.Handler.showHidePopupMenuItems();
      break;
    case 'show_icon_on_hide':
      if (firetray.Utils.prefService.getBoolPref(name))
        firetray.Handler.excludeOtherShowIconPrefs(name);
      firetray.Handler.showHideIcon();
      break;
    case 'mail_notification_enabled':
      if (firetray.Utils.prefService.getBoolPref('mail_notification_enabled')) {
        firetray.Messaging.init();
        firetray.Messaging.updateMsgCountWithCb();
      } else {
        firetray.Messaging.shutdown();
        firetray.Handler.setIconImageDefault();
      }
      break;
    case 'mail_notification_type':
    case 'icon_text_color':
      firetray.Messaging.updateIcon();
      break;
    case 'new_mail_icon_names':
      firetray.Handler.loadIcons();
    case 'excluded_folders_flags':
    case 'folder_count_recursive':
    case 'mail_accounts':
    case 'message_count_type':
    case 'only_favorite_folders':
      firetray.Messaging.updateMsgCountWithCb();
      break;
    case 'nomail_hides_icon':
      if (firetray.Utils.prefService.getBoolPref(name))
        firetray.Handler.excludeOtherShowIconPrefs(name);
      else
        firetray.Handler.setIconVisibility(true);
      firetray.Messaging.updateMsgCountWithCb();
      break;
    case 'app_mail_icon_names':
    case 'app_browser_icon_names':
    case 'app_default_icon_names':
      firetray.Handler.loadIcons(); // linux
    case 'app_icon_custom':
    case 'mail_icon_custom':
      firetray.Handler.loadImageCustom(name); // winnt
      firetray.Handler.setIconImageCustom(name);
    case 'app_icon_type':
      firetray.Handler.setIconImageDefault();
      if (firetray.Handler.inMailApp)
        firetray.Messaging.updateMsgCountWithCb();
      break;

    case 'chat_icon_enable':
      firetray.Handler.toggleChat(firetray.Handler.isChatEnabled());
      break;

    case 'chat_icon_blink':
      if (!firetray.ChatStatusIcon.isBlinking)
        return;
      let startBlinking = firetray.Utils.prefService.getBoolPref('chat_icon_blink');
      if (startBlinking) {
        firetray.Chat.startGetAttention();
      } else {
        firetray.Chat.stopGetAttention();
      }
      break;

    case 'chat_icon_blink_style':
      if (!firetray.Utils.prefService.getBoolPref('chat_icon_blink') ||
          !firetray.ChatStatusIcon.isBlinking)
        break;

      firetray.ChatStatusIcon.toggleBlinkStyle(
        firetray.Utils.prefService.getIntPref("chat_icon_blink_style"));
      break;

    default:
    }
  });

firetray.MailChatPrefListener = new PrefListener(
  "mail.chat.",
  function(branch, name) {
    log.debug('MailChat pref changed: '+name);
    switch (name) {
    case 'enabled':
      let enableChatCond =
            (firetray.Handler.appHasChat &&
             firetray.Utils.prefService.getBoolPref("chat_icon_enable") &&
             firetray.Handler.support['chat']);
      if (!enableChatCond) return;

      if (Services.prefs.getBoolPref("mail.chat.enabled")) {
        if (!firetray.Chat) {
//MR          Cu.import("resource://firetray/FiretrayMessaging.jsm"); // needed for existsChatAccount
//MR          Cu.import("resource://firetray/linux/FiretrayChat.jsm");
          firetray.Utils.addObservers(firetray.Handler, [
            "account-added", "account-removed"]);
        }
        if (firetray.Handler.existsChatAccount())
          firetray.Handler.toggleChat(true);

      } else {
        firetray.Handler.toggleChat(false);
      }
      break;
    default:
    }
  });
