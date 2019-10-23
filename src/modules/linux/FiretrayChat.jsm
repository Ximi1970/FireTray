/* -*- Mode: js2; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

var EXPORTED_SYMBOLS = [ "firetray" ];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource:///modules/imServices.jsm");
Cu.import("resource://firetray/commons.js");
Cu.import("resource://firetray/linux/FiretrayChatStatusIcon.jsm");
Cu.import("resource://firetray/linux/FiretrayWindow.jsm");

var { Logging } = ChromeUtils.import("resource://firetray/logging.jsm");
let log = Logging.getLogger("firetray.Chat");


firetray.Chat = {
  initialized: false,
  observedTopics: {},
  convsToAcknowledge: {
    ids: {},
    length: function(){return Object.keys(this.ids).length;}
  },

  init: function() {
    if (this.initialized) {
      log.warn("Chat already initialized");
      return true;
    }
    log.debug("Enabling Chat");

    firetray.Utils.addObservers(firetray.Chat, [
      // "*", // debugging
      "account-connected", "account-disconnected", "idle-time-changed",
      "new-directed-incoming-message", "status-changed",
      "unread-im-count-changed", "new-text"
    ]);

    firetray.ChatStatusIcon.init();
    if (firetray.Utils.prefService.getBoolPref("chat_icon_blink") &&
        firetray.Chat.convsToAcknowledge.length())
      this.startGetAttention();
    this.updateIcon();

    this.initialized = true;
    return true;
  },

  shutdown: function() {
    if (!this.initialized) return false;
    log.debug("Disabling Chat");

    if (firetray.Chat.convsToAcknowledge.length())
      this.stopGetAttention();

    firetray.ChatStatusIcon.shutdown();
    firetray.Utils.removeAllObservers(firetray.Chat);

    this.initialized = false;
    return true;
  },

  // FIXME: the listener should probably attached on the conv entry in the
  // contactlist during startGetAttentionMaybe
  attachSelectListeners: function(win) {
    log.debug("attachSelectListeners");
    ["contactlistbox", "tabmail"].forEach(function(eltId) {
      win.document.getElementById(eltId)
        .addEventListener('select', firetray.Chat.onSelect);
    });
  },

  detachSelectListeners: function(win) {
    ["contactlistbox", "tabmail"].forEach(function(eltId) {
      win.document.getElementById(eltId)
        .removeEventListener('select', firetray.Chat.onSelect);
    });
  },

  observe: function(subject, topic, data) {
    log.debug("RECEIVED Chat: "+topic+" subject="+subject+" data="+data);
    let conv = null;

    switch (topic) {
    case "account-connected":
    case "account-disconnected":
    case "idle-time-changed":
    case "status-changed":
      this.updateIcon();
      break;

    case "new-directed-incoming-message": // when PM or cited in channel
      conv = subject.QueryInterface(Ci.prplIMessage).conversation;
      log.debug("conversation name="+conv.name); // normalizedName shouldn't be necessary
      this.startGetAttentionMaybe(conv);
      break;

    /* Twitter is obviously considered a chatroom, not a private
     conversation. This is why we need to detect incoming messages and switch
     to the conversation differently. The actual read should be caught by
     focus-in-event and 'select' event on tabmail and contactlist */
    case "new-text":
      let msg = subject.QueryInterface(Ci.prplIMessage);
      conv = msg.conversation;
      log.debug("new-text from "+conv.title);
      let account = conv.account.QueryInterface(Ci.imIAccount);
      let proto = account.protocol;

      log.debug("msg from "+msg.who+", alias="+msg.alias+", account.normalizedName="+account.normalizedName);
      if (msg.who === account.normalizedName) break; // ignore msg from self
      if (proto.normalizedName !== 'twitter') break;
      this.startGetAttentionMaybe(conv);
      break;

    case "unread-im-count-changed":
      log.debug("unread-im-count-changed");
      let unreadMsgCount = data;
      if (unreadMsgCount == 0)
        this.stopGetAttentionMaybe(firetray.Handler.getActiveWindow());

      let localizedTooltip = PluralForm.get(
        unreadMsgCount,
        firetray.Utils.strings.GetStringFromName("tooltip.unread_messages"))
        .replace("#1", unreadMsgCount);
      firetray.ChatStatusIcon.setIconTooltip(localizedTooltip);
      break;

    default:
      log.warn("unhandled topic: "+topic);
    }
  },

  startGetAttentionMaybe: function(conv) {
    log.debug('startGetAttentionMaybe conv.id='+conv.id);

    let convIsCurrentlyShown =
          this.isConvCurrentlyShown(conv, firetray.Handler.getActiveWindow());
    log.debug("convIsCurrentlyShown="+convIsCurrentlyShown);
    if (convIsCurrentlyShown) return; // don't blink when conv tab already on top

    log.debug("firetray.ChatStatusIcon.isBlinking="+firetray.ChatStatusIcon.isBlinking);
    if (firetray.Utils.prefService.getBoolPref("chat_icon_blink") &&
        !firetray.ChatStatusIcon.isBlinking)
      this.startGetAttention(conv);

    this.convsToAcknowledge.ids[conv.id] = conv;
    log.debug(conv.id+' added to convsToAcknowledge, length='+this.convsToAcknowledge.length());
  },

  startGetAttention: function(conv) {
    log.debug("startGetAttention");
    if (conv)
      this.setUrgencyMaybe(conv);

    let blinkStyle = firetray.Utils.prefService.getIntPref("chat_icon_blink_style");
    log.debug("chat_icon_blink_style="+blinkStyle);
    if (blinkStyle === FIRETRAY_CHAT_ICON_BLINK_STYLE_NORMAL)
      firetray.ChatStatusIcon.startBlinking();
    else if (blinkStyle === FIRETRAY_CHAT_ICON_BLINK_STYLE_FADE)
      firetray.ChatStatusIcon.startFading();
    else
      throw new Error("Undefined chat icon blink style.");
  },

  /**
   * @param xid id of the window that MUST have initiated this event
   */
  stopGetAttentionMaybe: function(xid) {
    log.debug("stopGetAttentionMaybe");
    log.debug("convsToAcknowledgeLength="+this.convsToAcknowledge.length());
    if (!firetray.ChatStatusIcon.isBlinking) return;

    let selectedConv = this.getSelectedConv(xid);
    if (!selectedConv) return;

    for (let convId in this.convsToAcknowledge.ids) {
      log.debug(convId+" == "+selectedConv.id);
      if (convId == selectedConv.id) {
        delete this.convsToAcknowledge.ids[convId];
        break;
      }
    }

    // don't check chat_icon_blink: stopGetAttention even if it was unset
    log.debug("convsToAcknowledge.length()="+this.convsToAcknowledge.length());
    if (this.convsToAcknowledge.length() === 0)
      this.stopGetAttention(xid);
  },

  stopGetAttention: function(xid) {
    log.debug("do stop get attention !!!");
    if (xid)
      firetray.ChatStatusIcon.setUrgency(xid, false);

    let blinkStyle = firetray.Utils.prefService.getIntPref("chat_icon_blink_style");
    if (blinkStyle === FIRETRAY_CHAT_ICON_BLINK_STYLE_NORMAL)
      firetray.ChatStatusIcon.stopBlinking();
    else if (blinkStyle === FIRETRAY_CHAT_ICON_BLINK_STYLE_FADE)
      firetray.ChatStatusIcon.stopFading();
    else
      throw new Error("Undefined chat icon blink style.");
  },

  onSelect: function(event) {
    log.debug("select event ! ");
    firetray.Chat.stopGetAttentionMaybe(firetray.Handler.getActiveWindow());
  },

  isConvCurrentlyShown: function(conv, activeWin) {
    log.debug("isConvCurrentlyShown");
    let selectedConv = this.getSelectedConv(activeWin);
    if (!selectedConv) return false;

    log.debug("conv.title='"+conv.title+"' selectedConv.title='"+selectedConv.title+"'");
    return (conv.id == selectedConv.id);
  },

  getSelectedConv: function(activeWin) {
    if (!firetray.Handler.windows[activeWin]) return null;
    log.debug("getSelectedConv *");

    let activeChatTab = this.findSelectedChatTab(activeWin);
    if (!activeChatTab) return null;
    log.debug("getSelectedConv **");

    /* for now there is only one Chat tab, so we don't need to
     findSelectedChatTabFromTab(activeChatTab.tabNode). And, as there is only
     one forlderPaneBox, there will also probably be only one contactlistbox
     for all Chat tabs anyway */
    let selectedConv = this.findSelectedConv(activeWin);
    if (!selectedConv) return null;
    log.debug("getSelectedConv ***");

    return selectedConv;
  },

  findSelectedChatTab: function(xid) {
    let win = firetray.Handler.windows[xid].chromeWin;
    let tabmail = win.document.getElementById("tabmail");
    let chatTabs = tabmail.tabModes.chat.tabs;
    for (let tab of chatTabs)
      if (tab.tabNode.selected) return tab;
    return null;
  },

  findSelectedConv: function(xid) {
    let win = firetray.Handler.windows[xid].chromeWin;
    let selectedItem = win.document.getElementById("contactlistbox").selectedItem;
    if (!selectedItem || selectedItem.localName != "imconv") return null;
    return selectedItem.conv;
  },

  /* there can potentially be multiple windows, each with a Chat tab and the
   same conv open... so we need to handle urgency for all windows */
  setUrgencyMaybe: function(conv) {
    for (let xid in firetray.Handler.windows) {
      let win = firetray.Handler.windows[xid].chromeWin;
      let contactlist = win.document.getElementById("contactlistbox");
      for (let i=0; i<contactlist.itemCount; ++i) {
        let item = contactlist.getItemAtIndex(i);
        if (item.localName !== 'imconv')
          continue;
        /* item.conv is only initialized if chat tab is open */
        if (item.hasOwnProperty('conv') && item.conv.target === conv) {
          firetray.Window.setUrgency(xid, true);
          break;
        }
      }
    }
  },

  updateIcon: function() {
    let globalConnectedStatus = this.globalConnectedStatus();
    let userStatus;
    if (globalConnectedStatus)
      userStatus = Services.core.globalUserStatus.statusType;
    else
      userStatus = Ci.imIStatusInfo.STATUS_OFFLINE;
    log.debug("IM status="+userStatus);

    let iconName;
    switch (userStatus) {
    case Ci.imIStatusInfo.STATUS_OFFLINE:     // 1
      iconName = FIRETRAY_IM_STATUS_OFFLINE;
      break;
    case Ci.imIStatusInfo.STATUS_IDLE:        // 4
    case Ci.imIStatusInfo.STATUS_AWAY:        // 5
      iconName = FIRETRAY_IM_STATUS_AWAY;
      break;
    case Ci.imIStatusInfo.STATUS_AVAILABLE:   // 7
      iconName = FIRETRAY_IM_STATUS_AVAILABLE;
      break;
    case Ci.imIStatusInfo.STATUS_UNAVAILABLE: // 6
      iconName = FIRETRAY_IM_STATUS_BUSY;
      break;
    case Ci.imIStatusInfo.STATUS_UNKNOWN:     // 0
    case Ci.imIStatusInfo.STATUS_INVISIBLE:   // 2
    case Ci.imIStatusInfo.STATUS_MOBILE:      // 3
    default:                                  // ignore
    }

    log.debug("IM status changed="+iconName);
    if (iconName)
      firetray.ChatStatusIcon.setIconImage(iconName);
  },

  globalConnectedStatus: function() {
    /* Because we may already be connected during init (for ex. when toggling
     the chat_icon_enable pref), we need to updateIcon() during init(). But IM
     accounts' list is not initialized at early stage... */
    try {

      let accounts = Services.accounts.getAccounts();
      let globalConnected = false;

      while (accounts.hasMoreElements()) {
        let account = accounts.getNext().QueryInterface(Ci.imIAccount);
        log.debug("account="+account+" STATUS="+account.statusInfo.statusType+" connected="+account.connected);
        globalConnected = globalConnected || account.connected;
      }
      log.debug("globalConnected="+globalConnected);
      return globalConnected;

    } catch(e) {
      log.error(e); return false;
    }
  }

};
