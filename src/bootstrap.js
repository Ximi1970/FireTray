var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

const PREF_BRANCH = "extensions.firetray.";
const PREFS = {
  firstrun: true,

  hides_on_close: true,
  hides_on_minimize: true,
  hides_single_window: true,
  hides_last_only: false,
  start_hidden: false,
  show_activates: false,
  remember_desktop: false,

  app_icon_type: 0,
  app_browser_icon_names: '["web-browser", "internet-web-browser"]',
  app_mail_icon_names: '["indicator-messages", "applications-email-panel"]',
  app_default_icon_names: '[]',
  app_icon_custom: "",
  new_mail_icon_names: '["indicator-messages-new", "mail-message-new"]',
  show_icon_on_hide: false,
  scroll_hides: true,
  scroll_mode: "down_hides",
  middle_click: 0,
  chat_icon_enable: true,
  chat_icon_blink: true,
  chat_icon_blink_style: 0,

  mail_get_attention: true,
  nomail_hides_icon: false,
  message_count_type: 0,
  mail_notification_enabled: true,
  mail_unread_count_enabled: true,
  mail_notification_type: 0,
  icon_text_color: "#000000",
  mail_icon_custom: "",
  mail_change_trigger: "",
  folder_count_recursive: true,
  // Ci.nsMsgFolderFlags.Archive|Drafts|Junk|Queue|SentMail|Trash|Virtual
  excluded_folders_flags: 1077956384,
  // exposed in 1 tree, hence 2 branches: serverTypes, excludedAccounts
  mail_accounts: '{ "serverTypes": {"pop3":{"order":1,"excluded":false}, "imap":{"order":1,"excluded":false}, "movemail":{"order":2,"excluded":true}, "none":{"order":3,"excluded":false}, "rss":{"order":4,"excluded":true}, "nntp":{"order":5,"excluded":true}, "exquilla":{"order":6,"excluded":true}}, "excludedAccounts": [] }', // JSON
  only_favorite_folders: false,

  with_appindicator: false,
};

function setDefaultPrefs() {
  let branch = Services.prefs.getDefaultBranch(PREF_BRANCH);
  for (let key in PREFS) {
    switch (typeof PREFS[key]) {
      case "boolean":
        branch.setBoolPref(key, PREFS[key]);
        break;
      case "number":
        branch.setIntPref(key, PREFS[key]);
        break;
      case "string":
        branch.setCharPref(key, PREFS[key]);
        break;
      case "object":
        branch.setObjPref(key, PREFS[key]);
        break;
    }
  }
}

function getPref(key) {
  // Cache the prefbranch after first use
  if (getPref.branch == null)
    getPref.branch = Services.prefs.getBranch(PREF_BRANCH);
  // Figure out what type of pref to fetch
  switch (typeof PREFS[key]) {
    case "boolean":
      return getPref.branch.getBoolPref(key);
    case "number":
      return getPref.branch.getIntPref(key);
    case "string":
      return getPref.branch.getCharPref(key);
    case "object":
      return getPref.branch.getObjectPref(key);
  }
}

function install(data, reason) {
}

function uninstall(data, reason) {
}

function startup(data, reason) {
  // Check if the window we want to modify is already open.
  let windows = Services.wm.getEnumerator("mail:3pane");
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext();
    WindowListener.loadIntoWindow(domWindow);
  }

  // Wait for any new windows to open.
  Services.wm.addListener(WindowListener);
}

function shutdown(data, reason) {
  // When the application is shutting down we normally don't have to clean
  // up any UI changes made.
  if (reason == APP_SHUTDOWN) {
    return;
  }

  let windows = Services.wm.getEnumerator("mail:3pane");
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext();
    WindowListener.unloadFromWindow(domWindow);
  }

  // Stop listening for any new windows to open.
  Services.wm.removeListener(WindowListener);
}

var WindowListener = {

  async loadIntoWindow(window) {
    console.log("load (1/2): " + window.document.readyState);
    if (window.document.readyState != "complete") {
      // Make sure the window load has completed.
      await new Promise(resolve => {
        window.addEventListener("load", resolve, { once: true });
      });
    }

    this.loadIntoWindowAfterWindowIsReady(window);
  },

  loadIntoWindowAfterWindowIsReady(window) {
    console.log("load (2/2): " + window.document.readyState);    
    let document = window.document;

    // Take any steps to add UI or anything to the window
    // document.getElementById() etc. will work here.

    var { Logging } =  ChromeUtils.import("chrome://firetray/content/modules/logging.jsm");
    Logging.init();
    
    let log_test = Logging.getLogger("firetray.Test");
    log_test.debug("Debug test");
    log_test.info("Info test");
    log_test.log("Log test");
    log_test.warn("Warn test");
    log_test.error("Error test");

    
    setDefaultPrefs();

    var { firetrayChrome } =  ChromeUtils.import("chrome://firetray/content/overlay.js");

    let status = firetrayChrome.onLoad(window);

    console.log("Status: " + status);    

  },

  unloadFromWindow(window) {
    console.log("unload: " + window.document.readyState);
    let document = window.document;

    // Take any steps to remove UI or anything from the window
    // document.getElementById() etc. will work here.

  },

  // nsIWindowMediatorListener functions
  onOpenWindow(xulWindow) {
    // A new window has opened.
    let domWindow = xulWindow.QueryInterface(Ci.nsIInterfaceRequestor)
                             .getInterface(Ci.nsIDOMWindow);

    // Check if the opened window is the one we want to modify.
    if (domWindow.document.documentElement
                 .getAttribute("windowtype") === "mail:3pane") {
      this.loadIntoWindow(domWindow);
    }
  },

  onCloseWindow(xulWindow) {
  },

  onWindowTitleChange(xulWindow, newTitle) {
  },
};
