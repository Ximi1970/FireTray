/* -*- Mode: js2; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

var EXPORTED_SYMBOLS = [ "firetray", "FLDRS_UNINTERESTING" ];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
Cu.import("resource:///modules/iteratorUtils.jsm");
Cu.import("resource:///modules/MailServices.jsm");
Cu.import("resource://gre/modules/PluralForm.jsm");
Cu.import("resource://firetray/commons.js");

const FLDRS_UNINTERESTING = {
  Archive:   Ci.nsMsgFolderFlags.Archive,   // 0x00004000
  Drafts:    Ci.nsMsgFolderFlags.Drafts,    // 0x00000400
  Junk:      Ci.nsMsgFolderFlags.Junk,      // 0x40000000
  Queue:     Ci.nsMsgFolderFlags.Queue,     // 0x00000800
  SentMail:  Ci.nsMsgFolderFlags.SentMail,  // 0x00000200
  Templates: Ci.nsMsgFolderFlags.Templates, // 0x00400000
  Trash:     Ci.nsMsgFolderFlags.Trash,     // 0x00000100
  Virtual:   Ci.nsMsgFolderFlags.Virtual    // 0x00000020
};

const ACCOUNTS_PREF_BRANCH = "mail.accountmanager.accounts";

var { Logging } = ChromeUtils.import("resource://firetray/logging.jsm");
let log = Logging.getLogger("firetray.Messaging");


firetray.Messaging = {
  initialized: false,
  currentMsgCount: null,
  newMsgCount: null,

  init: function() {
    if (this.initialized) {
      log.warn("Messaging already initialized");
      return;
    }
    log.debug("Enabling Messaging");

    /* addPrefObserver() called after appStarted because it's hazardous to
     clean our excludedAccounts while mail.accountmanager.accounts is being
     built dynamically at startup */

    let that = this;
    MailServices.mailSession.AddFolderListener(that.mailSessionListener,
                                               that.mailSessionListener.notificationFlags);

    this.initialized = true;
  },

  shutdown: function() {
    if (!this.initialized) return;
    log.debug("Disabling Messaging");

    MailServices.mailSession.RemoveFolderListener(this.mailSessionListener);

    this.removePrefObserver();

    this.initialized = false;
  },

  addPrefObserver: function() {
    // includes IM accounts
    Services.prefs.addObserver(ACCOUNTS_PREF_BRANCH, this, false);
    log.debug("PrefObserver added");
  },
  removePrefObserver: function() {
    Services.prefs.removeObserver(ACCOUNTS_PREF_BRANCH, this);
  },

  /* could also use a PrefListener, but let's keep it simple for now */
  observe: function(subject, topic, data) {
    if (topic === "nsPref:changed" && data === ACCOUNTS_PREF_BRANCH) {
      log.debug(ACCOUNTS_PREF_BRANCH+"="+subject.QueryInterface(Ci.nsIPrefBranch).getCharPref(ACCOUNTS_PREF_BRANCH));
      this.cleanExcludedAccounts();
    }
  },

  /* removes removed accounts from excludedAccounts pref. NOTE: Can't be called
    at shutdown because MailServices.accounts no longer available */
  cleanExcludedAccounts: function() {
    log.info("* cleaning *");
    let mailAccounts = firetray.Utils.getObjPref('mail_accounts');
    let excludedAccounts = mailAccounts["excludedAccounts"];

    // build current list of account server keys
    let accounts = MailServices.accounts.accounts;
    let accountServerKeys = [];
    for (let account of fixIterator(MailServices.accounts, Ci.nsIMsgAccount)) {
      accountServerKeys.push(account.incomingServer.key);
    }

    let newExcludedAccounts = [], cleaningNeeded = 0;
    for (let i=0, len=excludedAccounts.length; i<len; ++i) {
      let excludedAccount = excludedAccounts[i];
      if (accountServerKeys.indexOf(excludedAccount) >= 0)
        newExcludedAccounts.push(excludedAccount);
      else
        cleaningNeeded += 1;
    }

    if (cleaningNeeded) {
      log.debug("cleaning excluded accounts");
      let prefObj = {"serverTypes":mailAccounts["serverTypes"], "excludedAccounts":newExcludedAccounts};
      firetray.Utils.setObjPref('mail_accounts', prefObj);
    }
  },

  // https://bugzilla.mozilla.org/show_bug.cgi?id=715799 for TB15+
  // mozINewMailNotificationService (alternative message counting)
  /* http://mxr.mozilla.org/comm-central/source/mailnews/base/public/nsIFolderListener.idl */
  mailSessionListener: {
    notificationFlags:
      // Ci.nsIFolderListener.propertyChanged |
      Ci.nsIFolderListener.propertyFlagChanged |
      // Ci.nsIFolderListener.event |
      Ci.nsIFolderListener.boolPropertyChanged |
      Ci.nsIFolderListener.intPropertyChanged,

    OnItemPropertyChanged: function(item, property, oldValue, newValue) { // NumNewBiffMessages
      log.debug("OnItemPropertyChanged "+property+" for folder "+item.prettyName+" was "+oldValue+" became "+newValue+" NEW MESSAGES="+item.getNumNewMessages(true));
    },

    OnItemIntPropertyChanged: function(item, property, oldValue, newValue) { // TotalUnreadMessages, BiffState (per server)
      log.debug("OnItemIntPropertyChanged "+property+" for folder "+item.prettyName+" was "+oldValue+" became "+newValue+" NEW MESSAGES="+item.getNumNewMessages(true));
      this.onMsgCountChange(item, property, oldValue, newValue);
    },

    OnItemBoolPropertyChanged: function(item, property, oldValue, newValue) { // NewMessages (per folder)
      log.debug("OnItemBoolPropertyChanged "+property+" for folder "+item.prettyName+" was "+oldValue+" became "+newValue+" NEW MESSAGES="+item.getNumNewMessages(true));
      this.onMsgCountChange(item, property, oldValue, newValue);
    },

    OnItemPropertyFlagChanged: function(item, property, oldFlag, newFlag) {
      log.debug("OnItemPropertyFlagChanged"+property+" for "+item+" was "+oldFlag+" became "+newFlag);
      this.onMsgCountChange(item, property, oldFlag, newFlag);
    },

    OnItemEvent: function(item, event) {
      log.debug("OnItemEvent "+event+" for folder "+item.prettyName);
    },

    onMsgCountChange: function(item, property, oldValue, newValue) {
      let excludedFoldersFlags = firetray.Utils.prefService.getIntPref("excluded_folders_flags");
      let onlyFavorites = firetray.Utils.prefService.getBoolPref("only_favorite_folders");
      let msgCountType = firetray.Utils.prefService.getIntPref("message_count_type");

      if (!(item.flags & excludedFoldersFlags)) {
        let prop = property.toString();
        if (prop === "FolderFlag" && onlyFavorites) {
          if ((oldValue ^ newValue) & Ci.nsMsgFolderFlags.Favorite)
            firetray.Messaging.updateMsgCountWithCb();
        } else if (prop === "TotalUnreadMessages" &&
                   msgCountType === FIRETRAY_MESSAGE_COUNT_TYPE_UNREAD) {
          firetray.Messaging.updateMsgCountWithCb();
        } else if (prop === "NewMessages" &&
                   msgCountType === FIRETRAY_MESSAGE_COUNT_TYPE_NEW) {
          if (oldValue === true && newValue === false)
            item.setNumNewMessages(0); // https://bugzilla.mozilla.org/show_bug.cgi?id=727460
          firetray.Messaging.updateMsgCountWithCb();
        }
      }
    }
  },

  /**
   * @param callback: optional callback to call when msgCount changed.
   */
  updateMsgCountWithCb: function(callback) {
    log.debug("updateMsgCountWithCb");
    if (!this.initialized) return;

    if ("undefined" === typeof(callback) || !callback)
      callback = function(currentMsgCount, newMsgCount) { // default
        firetray.Messaging.updateIcon(newMsgCount);

        if (newMsgCount !== currentMsgCount) {
          let mailChangeTriggerFile = firetray.Utils.prefService.getCharPref("mail_change_trigger");
          if (mailChangeTriggerFile)
            firetray.Messaging.runProcess(mailChangeTriggerFile, [newMsgCount.toString()]);

          let getAttention = firetray.Utils.prefService.getBoolPref("mail_get_attention");
          if (getAttention && (newMsgCount > currentMsgCount))
            for (let winId in firetray.Handler.windows)
              firetray.Handler.windowGetAttention(winId);
        }
      };

    let msgCountType = firetray.Utils.prefService.getIntPref("message_count_type");
    log.debug("msgCountType="+msgCountType);
    if (msgCountType === FIRETRAY_MESSAGE_COUNT_TYPE_UNREAD) {
      this.countMessages("UnreadMessages");
    } else if (msgCountType === FIRETRAY_MESSAGE_COUNT_TYPE_NEW) {
      this.countMessages("HasNewMessages");
    } else
      log.error('unknown message count type');

    /* currentMsgCount and newMsgCount may be integers or bool, which do
     also support comparaison operations */
    callback.call(this, this.currentMsgCount, this.newMsgCount);
    this.currentMsgCount = this.newMsgCount;
  },

  updateIcon: function(msgCount) {
    log.debug("updateIcon");
    if ("undefined" === typeof(msgCount)) msgCount = this.currentMsgCount;

    let localizedTooltip;
    let msgCountType = firetray.Utils.prefService.getIntPref("message_count_type");
    if (msgCountType === FIRETRAY_MESSAGE_COUNT_TYPE_UNREAD) {
      localizedTooltip = PluralForm.get(
        msgCount,
        firetray.Utils.strings.GetStringFromName("tooltip.unread_messages"))
        .replace("#1", msgCount);
      log.debug(localizedTooltip);
    } else if (msgCountType === FIRETRAY_MESSAGE_COUNT_TYPE_NEW) {
      localizedTooltip = firetray.Utils.strings.GetStringFromName("tooltip.new_messages");
    } else
      log.error('unknown message count type');

    if (msgCount == 0) {

      firetray.Handler.setIconImageDefault();
      firetray.Handler.setIconTooltipDefault();

    } else if (msgCount > 0) {
      let prefMailUnreadCountEnabled = firetray.Utils.prefService.getBoolPref('mail_unread_count_enabled');
      let prefMailNotification = firetray.Utils.prefService.getIntPref('mail_notification_type');
      
      log.debug("msgCount prefMailUnreadCount="+prefMailUnreadCountEnabled);
      log.debug("msgCount prefMailNotification="+prefMailNotification);
 
      switch (prefMailNotification) {
      case FIRETRAY_NOTIFICATION_BLANK_ICON:
        firetray.Handler.setIconImageBlank();
        break;
      case FIRETRAY_NOTIFICATION_NEWMAIL_ICON:
        firetray.Handler.setIconImageNewMail();
        break;
      case FIRETRAY_NOTIFICATION_CUSTOM_ICON:
        firetray.Handler.setIconImageCustom('mail_icon_custom');
        break;
      default:
        log.error("Unknown notification mode: "+prefMailNotification);
      }
     
      if (prefMailUnreadCountEnabled) {
        let prefIconTextColor = firetray.Utils.prefService.getCharPref("icon_text_color");
        firetray.Handler.setIconText(msgCount.toString(), prefIconTextColor);
      }

      firetray.Handler.setIconTooltip(localizedTooltip);

    } else {
      throw "negative message count"; // should never happen
    }

    firetray.Handler.showHideIcon(msgCount);
  },

  /**
   * computes total unread or new message count.
   */
  countMessages: function(countType) {
    let mailAccounts = firetray.Utils.getObjPref('mail_accounts');
    log.debug("mail accounts from pref: "+JSON.stringify(mailAccounts));
    let serverTypes = mailAccounts["serverTypes"];
    let excludedAccounts = mailAccounts["excludedAccounts"];

    this.newMsgCount = 0;
    let accounts = firetray.Messaging.Accounts();
    for (let accountServer of accounts) { // nsIMsgIncomingServer

      if (accountServer.type === FIRETRAY_ACCOUNT_SERVER_TYPE_IM) {
        continue;               // IM messages are counted elsewhere
      } else if (!serverTypes[accountServer.type]) {
        log.warn("'"+accountServer.type+"' server type is not handled");
        continue;
      }

      log.debug("is servertype excluded: "+serverTypes[accountServer.type].excluded+", account exclusion index: "+excludedAccounts.indexOf(accountServer.key));
      if ((serverTypes[accountServer.type].excluded) ||
          (excludedAccounts.indexOf(accountServer.key) >= 0))
        continue;

      this.applyToSubfolders(
        accountServer.rootFolder,
        firetray.Utils.prefService.getBoolPref("folder_count_recursive"),
        function(folder){this.msgCountIterate(countType, folder);}
      );

    }
    log.debug("Total "+countType+"="+this.newMsgCount);
  },

  /**
   * @param folder: a nsIMsgFolder
   * @param recursive: if we should look into nested folders
   * @param fun: a function to apply to all folders
   */
  applyToSubfolders: function(folder, recursive, fun) {
    if (folder.hasSubFolders) {
      let subFolders = folder.subFolders;
      while(subFolders.hasMoreElements()) {
        let subFolder = subFolders.getNext().QueryInterface(Ci.nsIMsgFolder);
        if (recursive && subFolder.hasSubFolders)
          firetray.Messaging.applyToSubfoldersRecursive(subFolder, recursive, fun);
        else
          fun.call(this, subFolder);
      }
    }
  },
  applyToSubfoldersRecursive: function(folder, recursive, fun) {
    fun.call(this, folder);
    this.applyToSubfolders(folder, recursive, fun);
  },

  /**
   * @param type: one of 'UnreadMessages', 'HasNewMessages'
   */
  msgCountIterate: function(type, folder) {
    let onlyFavorites = firetray.Utils.prefService.getBoolPref("only_favorite_folders");
    let excludedFoldersFlags = firetray.Utils.prefService.getIntPref("excluded_folders_flags");
    if (!(folder.flags & excludedFoldersFlags)) {
      if (!onlyFavorites || folder.flags & Ci.nsMsgFolderFlags.Favorite) {
        firetray.Messaging["add"+type](folder);
      }
    }
    log.debug("newMsgCount="+this.newMsgCount);
  },

  addUnreadMessages: function(folder) {
    let folderUnreadMsgCount = folder['getNumUnread'](false);
    log.debug("folder: "+folder.prettyName+" folderUnreadMsgCount="+folderUnreadMsgCount);
    /* nsMsgDBFolder::GetNumUnread basically returns mNumUnreadMessages +
      mNumPendingUnreadMessages, while mNumPendingUnreadMessages may get -1
      when updated from the cache. Which means getNumUnread might return -1. */
    if (folderUnreadMsgCount > 0)
      this.newMsgCount += folderUnreadMsgCount;
  },

  addHasNewMessages: function(folder) {
    let folderNewMsgCount = folder.hasNewMessages;
    log.debug("folder: "+folder.prettyName+" hasNewMessages="+folderNewMsgCount);
    this.newMsgCount = this.newMsgCount || folderNewMsgCount;
  },

  runProcess: function(filepath, args) {
    log.debug("runProcess="+filepath+" args="+args);
    try {
      // create a file for the process
      var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
      file.initWithPath(filepath);

      // create the process
      var process = Cc["@mozilla.org/process/util;1"]
            .createInstance(Ci.nsIProcess);
      process.init(file);

      process.run(false, args, args.length);
    } catch(x) {log.error(x);}
  }

};


/**
 * Accounts Iterator/Generator for iterating over all account servers.
 * NOTE: MailServices.accounts.allServers excludes hidden and IM servers
 * @param sortByTypeAndName: boolean
 * @return a generator over all nsIMsgIncomingServer including hidden and IM ones
 */
firetray.Messaging.Accounts = function*(sortByTypeAndName) {
  if (typeof(sortByTypeAndName) === "undefined") {
    sortByTypeAndName = false;
  } else if (typeof(sortByTypeAndName) !== "boolean") {
    throw new TypeError();
  }

  log.debug("sortByTypeAndName=" + sortByTypeAndName);

  /* NOTE: sort() not provided by nsIMsgAccountManager.accounts
   (nsISupportsArray or nsIArray if xulrunner >= 20.0). Should be OK to
   re-build a JS-Array for few accounts */
  let accountServers = [];
  for (let accountServer of fixIterator(MailServices.accounts.accounts,
                                        Ci.nsIMsgAccount)) {
    accountServers.push(accountServer.incomingServer);
  }

  let mailAccounts = firetray.Utils.getObjPref('mail_accounts');
  let serverTypes = mailAccounts["serverTypes"];
  if (sortByTypeAndName) {
    accountServers.sort(function(a,b) {
      if (serverTypes[a.type].order
          < serverTypes[b.type].order)
        return -1;
      if (serverTypes[a.type].order
          > serverTypes[b.type].order)
        return 1;
      if (a.prettyName < b.prettyName)
        return -1;
      if (a.prettyName > b.prettyName)
        return 1;
      return 0; // no sorting
    });
  }

  for (let i=0, len=accountServers.length; i<len; ++i) {
    log.debug("ACCOUNT: "+accountServers[i].prettyName+" type: "+accountServers[i].type);
    yield accountServers[i];
  }
};

/**
 * return accounts grouped by mail_accounts.
 *
 * ex: { movemail: {"server1", "server2"}, imap: {"server3"} }
 */
firetray.Messaging.accountsByServerType = function() {
  let accountsByServerType = {};
  let accounts = firetray.Messaging.Accounts(false);
  for (let accountServer of accounts) {
    let accountServerKey = accountServer.key.toString();
    let accountServerName = accountServer.prettyName;
    let accountServerType = accountServer.type;
    if (typeof(accountsByServerType[accountServerType]) == "undefined")
      accountsByServerType[accountServerType] = [];
    accountsByServerType[accountServerType].push(
      { key: accountServerKey, name: accountServerName });
  }
  return accountsByServerType;
};
