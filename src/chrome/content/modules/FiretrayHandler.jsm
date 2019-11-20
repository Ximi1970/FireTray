var EXPORTED_SYMBOLS = [ "firetray" ];

var { firetray,
      FIRETRAY_GTK,
      FIRETRAY_PREF_BRANCH,
      FIRETRAY_OS_SUPPORT,
      FIRETRAY_APP_DB,
      FIRETRAY_ACCOUNT_SERVER_TYPE_IM,
      FIRETRAY_DELAY_STARTUP_MILLISECONDS,
      FIRETRAY_DELAY_NOWAIT_MILLISECONDS
    } = ChromeUtils.import("chrome://firetray/content/modules/commons.jsm");
var { PrefListener } = ChromeUtils.import("chrome://firetray/content/modules/PrefListener.jsm");

var { Logging } = ChromeUtils.import("chrome://firetray/content/modules/logging.jsm");
let log = Logging.getLogger("firetray.Handler");

var { firetray } = ChromeUtils.import("chrome://firetray/content/modules/"+Services.appinfo.OS.toLowerCase()+"/FiretrayStatusIcon.jsm");
log.debug("FiretrayStatusIcon "+Services.appinfo.OS.toLowerCase()+" imported");
var { firetray } = ChromeUtils.import("chrome://firetray/content/modules/"+Services.appinfo.OS.toLowerCase()+"/FiretrayWindow.jsm");
log.debug("FiretrayWindow "+Services.appinfo.OS.toLowerCase()+" imported");

var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
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
    widgetTk: FIRETRAY_GTK,
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

  readTBRestoreWindowsCount: function() {
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

      return initialState.windows.length;
    }
    return null;
  },
  
  // Interface Windows

  registerWindow: function(win) {
    return firetray.Window.registerWindow(win);
  },
  unregisterWindow: function(win) {
        return 0;
  },
  hideWindow: function(winId) {
  },
  hideAllWindows: function() {
    log.debug("hideAllWindows");
  },
  onMinimize: function(wid) {
    log.debug("onMinimize");
    return true;
  },
  
  showHideIcon: function(msgCount) {
  },
  
  /** nsIBaseWindow, nsIXULWindow, ... */
  getWindowInterface: function(win, iface) {
    let winInterface;
    let winOut;
    try {                       // thx Neil Deakin !!
        winInterface =  win.getInterface(Ci.nsIWebNavigation)
        .QueryInterface(Ci.nsIDocShellTreeItem)
        .treeOwner;
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
