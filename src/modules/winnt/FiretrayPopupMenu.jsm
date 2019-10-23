/* -*- Mode: js2; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

var EXPORTED_SYMBOLS = [ "firetray" ];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/ctypes.jsm");
Cu.import("resource://firetray/ctypes/winnt/win32.jsm");
Cu.import("resource://firetray/ctypes/winnt/user32.jsm");
Cu.import("resource://firetray/commons.js");
firetray.Handler.subscribeLibsForClosing([user32]);

var { Logging } = ChromeUtils.import("resource://firetray/logging.jsm");
let log = Logging.getLogger("firetray.PopupMenu");

if ("undefined" == typeof(firetray.StatusIcon))
  log.error("This module MUST be imported from/after StatusIcon !");

// popupmenu items
const IDM_PREF    = 100;
const IDM_QUIT    = 200;
const IDM_NEW_MSG = 300;
const IDM_NEW_WND = 400;
const IDM_RESET   = 500;


firetray.PopupMenu = {
  initialized: false,
  menu: null,

  init: function() {
    this.create();

    this.initialized = true;
    return true;
  },

  shutdown: function() {
    this.destroy();

    log.debug("Disabling PopupMenu");
    this.initialized = false;
  },

  create: function() {
    this.menu = user32.CreatePopupMenu();
    log.debug("menu="+this.menu);

    this.insertMenuItem('Quit', 'quit', IDM_QUIT);
    this.insertSeparator();
    this.insertMenuItem('Preferences', 'prefs', IDM_PREF);

    let menuSeparatorAdded = false;
    if (firetray.Handler.inBrowserApp) {
      this.insertSeparator();
      menuSeparatorAdded = true;
      this.insertMenuItem('NewWindow', 'new-wnd', IDM_NEW_WND);
    }

    if (firetray.Handler.inMailApp) {
      if (!menuSeparatorAdded) {
        this.insertSeparator();
      }
      this.insertMenuItem('NewMessage', 'new-msg', IDM_NEW_MSG);
      this.insertMenuItem('ResetIcon', 'reset', IDM_RESET);
    }

    log.debug("PopupMenu created");
  },

  destroy: function() {
    user32.DestroyMenu(this.menu);
    log.debug("PopupMenu destroyed");
  },

  insertMenuItem: function(itemName, iconName, actionId) {
    var menuItemLabel = firetray.Utils.strings.GetStringFromName("popupMenu.itemLabel."+itemName);
    let mii = new user32.MENUITEMINFOW();
    // BUG: ctypes doesn't detect wrong field assignments mii.size = ... ('size' undefined)
    mii.cbSize = user32.MENUITEMINFOW.size;
    mii.fMask = user32.MIIM_ID | user32.MIIM_STRING | user32.MIIM_DATA;
    mii.wID = actionId;
    // mii.dwItemData = win32.ULONG_PTR(actionId);
    mii.dwTypeData = win32._T(menuItemLabel);
    /* Under XP, putting a bitmap into hbmpItem results in ugly icons. We
     should probably use HBMMENU_CALLBACK as explained in
     http://www.nanoant.com/programming/themed-menus-icons-a-complete-vista-xp-solution.
     But for now, we just don't display icons in XP-. */
    if (win32.WINVER >= win32.WIN_VERSIONS["Vista"]) {
      mii.fMask |= user32.MIIM_BITMAP;
      mii.hbmpItem = firetray.StatusIcon.bitmaps.get(iconName);
    }
    log.debug("mii="+mii);
    if (!user32.InsertMenuItemW(this.menu, 0, true, mii.address())) {
      log.error("InsertMenuItemW failed winLastError="+ctypes.winLastError);
    }
  },

  insertSeparator: function() {
    user32.InsertMenuW(this.menu, 0, user32.MF_BYPOSITION|user32.MF_SEPARATOR,
                       0, null);
  },

  /**
   * @param force: useful to start_hidden, when window is not shown
   */
  addWindowItemAndSeparatorMaybe: function(wid, force) {
    if (typeof force === "undefined") force = false;
    if (force || firetray.Handler.visibleWindowsCount === firetray.Handler.windowsCount)
      this.insertSeparator();
    this.addWindowItem(wid);
  },
  removeWindowItemAndSeparatorMaybe: function(wid) {
    this.removeWindowItem(wid);
    if (firetray.Handler.visibleWindowsCount === firetray.Handler.windowsCount - 1)
      user32.DeleteMenu(this.menu, 0, user32.MF_BYPOSITION);
  },

  addWindowItem: function(wid) {
    let title = firetray.Window.getWindowTitle(wid);
    let mii = new user32.MENUITEMINFOW();
    mii.cbSize = user32.MENUITEMINFOW.size;
    mii.fMask = user32.MIIM_ID | user32.MIIM_STRING | user32.MIIM_DATA;
    mii.wID = ctypes.UInt64(wid);
    mii.dwTypeData = win32._T(title);
    if (!user32.InsertMenuItemW(this.menu, 0, true, mii.address())) {
      log.error("InsertMenuItemW failed winLastError="+ctypes.winLastError);
    }
  },
  removeWindowItem: function(wid) {
    let itemId = ctypes.UInt64(wid);
    if (!user32.DeleteMenu(this.menu, itemId, user32.MF_BYCOMMAND)) {
      log.error("DeleteMenu failed winLastError="+ctypes.winLastError);
    }
  },

  processMenuItem: function(itemId) {
    let wid = firetray.Win32.hwndToHexStr(win32.HWND(itemId));
    if (firetray.Handler.windows[wid]) {
      firetray.Handler.showWindow(wid);
      return;
    }

    switch (win32.LOWORD(itemId)) {
    case IDM_PREF:
      log.debug("IDM_PREF");
      firetray.Handler.openPrefWindow();
      break;
    case IDM_QUIT:
      log.debug("IDM_QUIT");
      firetray.Handler.quitApplication();
      break;
    case IDM_NEW_MSG:
      log.debug("IDM_NEW_MSG");
      firetray.Handler.openMailMessage();
      break;
    case IDM_NEW_WND:
      log.debug("IDM_NEW_WND");
      firetray.Handler.openBrowserWindow();
      break;
    case IDM_RESET:
      log.debug("IDM_RESET");
      firetray.Handler.setIconImageDefault();
      break;
    default:
      log.error("no action for itemId ("+itemId+")");
    }
  }

}; // firetray.PopupMenu

firetray.Handler.addPopupMenuWindowItemAndSeparatorMaybe =
  firetray.PopupMenu.addWindowItemAndSeparatorMaybe.bind(firetray.PopupMenu);
firetray.Handler.removePopupMenuWindowItemAndSeparatorMaybe =
  firetray.PopupMenu.removeWindowItemAndSeparatorMaybe.bind(firetray.PopupMenu);
