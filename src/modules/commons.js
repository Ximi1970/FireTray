/* -*- Mode: js2; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

/* for now, logging facilities (imported from logging.jsm) and Services are
   automatically provided by this module */
var EXPORTED_SYMBOLS =
  [ "firetray", "FIRETRAY_OS_SUPPORT", "FIRETRAY_ID",
    "FIRETRAY_PREF_BRANCH",
    "FIRETRAY_APPLICATION_ICON_TYPE_THEMED",
    "FIRETRAY_APPLICATION_ICON_TYPE_CUSTOM",
    "FIRETRAY_MIDDLE_CLICK_ACTIVATE_LAST", "FIRETRAY_MIDDLE_CLICK_SHOW_HIDE",
    "FIRETRAY_NOTIFICATION_BLANK_ICON",
    "FIRETRAY_NOTIFICATION_NEWMAIL_ICON", "FIRETRAY_NOTIFICATION_CUSTOM_ICON",
    "FIRETRAY_IM_STATUS_AVAILABLE", "FIRETRAY_IM_STATUS_AWAY",
    "FIRETRAY_IM_STATUS_BUSY", "FIRETRAY_IM_STATUS_OFFLINE",
    "FIRETRAY_ACCOUNT_SERVER_TYPE_IM", "FIRETRAY_DELAY_STARTUP_MILLISECONDS",
    "FIRETRAY_DELAY_NOWAIT_MILLISECONDS", "FIRETRAY_MESSAGE_COUNT_TYPE_UNREAD",
    "FIRETRAY_MESSAGE_COUNT_TYPE_NEW", "FIRETRAY_CHAT_ICON_BLINK_STYLE_NORMAL",
    "FIRETRAY_CHAT_ICON_BLINK_STYLE_FADE", "FIRETRAY_APPINDICATOR_ID",
    "FIRETRAY_APP_DB", "FIRETRAY_CB_SENTINEL", "FIRETRAY_GTK" ];

const Cc = Components.classes;
const Ci = Components.interfaces;

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

const FIRETRAY_OS_SUPPORT  = ['freebsd', 'linux', 'winnt']; // install.rdf sync :(
const FIRETRAY_ID          = "{9533f794-00b4-4354-aa15-c2bbda6989f8}";
const FIRETRAY_PREF_BRANCH = "extensions.firetray.";

const FIRETRAY_APPLICATION_ICON_TYPE_THEMED = 0;
const FIRETRAY_APPLICATION_ICON_TYPE_CUSTOM = 1;

const FIRETRAY_MIDDLE_CLICK_ACTIVATE_LAST = 0;
const FIRETRAY_MIDDLE_CLICK_SHOW_HIDE     = 1;

const FIRETRAY_MESSAGE_COUNT_TYPE_UNREAD  = 0;
const FIRETRAY_MESSAGE_COUNT_TYPE_NEW     = 1;

const FIRETRAY_NOTIFICATION_BLANK_ICON    = 0;
const FIRETRAY_NOTIFICATION_NEWMAIL_ICON  = 1;
const FIRETRAY_NOTIFICATION_CUSTOM_ICON   = 2;

const FIRETRAY_IM_STATUS_AVAILABLE = "user-available";
const FIRETRAY_IM_STATUS_AWAY      = "user-away";
const FIRETRAY_IM_STATUS_BUSY      = "user-busy";
const FIRETRAY_IM_STATUS_OFFLINE   = "user-offline";

const FIRETRAY_ACCOUNT_SERVER_TYPE_IM = "im";

const FIRETRAY_DELAY_STARTUP_MILLISECONDS = 500;
const FIRETRAY_DELAY_NOWAIT_MILLISECONDS  = 0;

const FIRETRAY_CHAT_ICON_BLINK_STYLE_NORMAL = 0;
const FIRETRAY_CHAT_ICON_BLINK_STYLE_FADE   = 1;

const FIRETRAY_APPINDICATOR_ID = "firetray";

const FIRETRAY_GTK = "gtk3";

const FIRETRAY_APP_DB = {

  firefox: {
    id: "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}",
  },

  thunderbird: {
    id:  "{3550f703-e582-4d05-9a08-453d09bdfdc6}",
  },

  seamonkey: {
    id: "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}",
  },

  songbird: {
    id: "songbird@songbirdnest.com",
  },

  sunbird: {
    id: "{718e30fb-e89b-41dd-9da7-e25a45638b28}",
  },

  chatzilla: {
    id: "{59c81df5-4b7a-477b-912d-4e0fdf64e5f2}",
  },

  zotero: {
    id: "zotero@chnm.gmu.edu",
  }

};

/*
 * Debugging purpose: if a callback fails (like "expected type int, got (void
 * 0)"), there is no easy way to find out which (for ex. when called through
 * g_signal_connect()). A possible way is to remove the sentinel definition on
 * each callback definition one-by-one. For ex:
 *
 *   let callback = gtk.GCallbackWidgetFocusEvent_t(
 *     firetray.Window.onFocusIn, null, FIRETRAY_CB_SENTINEL);
 *
 * becomes
 *
 *   let callback = gtk.GCallbackWidgetFocusEvent_t(
 *     firetray.Window.onFocusIn);
 *
 * and see if the the message "JavaScript callback failed, and an error
 * sentinel was not specified" appears in the console.
 *
 * Note: it's not possible to define a sentinel when the return type is void.
 * Note: almost all return types end up as int's (even gboolean).
 */
const FIRETRAY_CB_SENTINEL = -1;

/**
 * firetray namespace.
 */
if ("undefined" == typeof(firetray)) {
  var firetray = {};
};

var { Logging } = ChromeUtils.import("resource://firetray/logging.jsm");
let log = Logging.getLogger("firetray.commons");

firetray.Utils = {
  prefService: Services.prefs.getBranch(FIRETRAY_PREF_BRANCH),
  strings: Services.strings.createBundle("chrome://firetray/locale/overlay.properties"),

  addObservers: function(handler, topics){
    topics.forEach(function(topic){
      if (this.observedTopics[topic]) {
        log.warn(topic+" already registred for "+handler);
        return;
      }

      Services.obs.addObserver(this, topic, false);
      this.observedTopics[topic] = true;
      log.debug("registred "+topic+" for "+handler);
    }, handler);
  },

  removeObservers: function(handler, topics) {
    topics.forEach(function(topic){
      Services.obs.removeObserver(this, topic);
      delete this.observedTopics[topic];
    }, handler);
  },

  removeAllObservers: function(handler) {
    for (let topic in handler.observedTopics)
      Services.obs.removeObserver(handler, topic);
    handler.observedTopics = {};
  },

  getObjPref: function(prefStr) {
    try {
      var objPref = JSON.parse(
        firetray.Utils.prefService.getCharPref(prefStr));
    } catch (x) {
      log.error(x);
    }
    return objPref;
  },
  setObjPref: function(prefStr, obj) {
    log.debug(obj);
    try {
      firetray.Utils.prefService.setCharPref(prefStr, JSON.stringify(obj));
    } catch (x) {
      log.error(x);
    }
  },

  getArrayPref: function(prefStr) {
    let arrayPref = this.getObjPref(prefStr);
    if (!firetray.js.isArray(arrayPref))
      throw new TypeError("'"+prefStr+"' preference is not array.");
    return arrayPref;
  },
  setArrayPref: function(prefStr, aArray) {
    if (!firetray.js.isArray(aArray))
      throw new TypeError("'"+aArray+"' is not array.");
    this.setObjPref(prefStr, aArray);
  },

  QueryInterfaces: function(obj) {
    for (i of Components.interfaces)
      try {
        if (obj instanceof i) log.debug (i);
      } catch(x) {}
  },

  // adapted from http://forums.mozillazine.org/viewtopic.php?p=921150#921150
  chromeToPath: function(aPath) {
    if (!aPath || !(/^chrome:/.test(aPath)))
      return null;              // not a chrome url

    let uri = Services.io.newURI(aPath, "UTF-8", null);
    let registeryValue = Cc['@mozilla.org/chrome/chrome-registry;1']
      .getService(Ci.nsIChromeRegistry)
      .convertChromeURL(uri).spec;
    log.debug(registeryValue);

    if (/^file:/.test(registeryValue))
      registeryValue = this._urlToPath(registeryValue);
    else
      registeryValue = this._urlToPath("file://"+registeryValue);

    return registeryValue;
  },

  _urlToPath: function (aPath) {
    if (!aPath || !/^file:/.test(aPath))
      return null;

    let protocolHandler = Cc["@mozilla.org/network/protocol;1?name=file"]
      .createInstance(Ci.nsIFileProtocolHandler);
    return protocolHandler.getFileFromURLSpec(aPath).path;
  },

  dumpObj: function(obj) {},    // Use JSON.stringify(obj) instead.

  _nsResolver: function(prefix) {
    var ns = {
      xul: "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul"
    };
    return ns[prefix] || null;
  },

  // adapted from http://code.google.com/p/jslibs/wiki/InternalTipsAndTricks
  XPath: function(ref, xpath) {
    var doc = ref.ownerDocument || ref;

    try {
      let that = this;
      var result = doc.evaluate(xpath, ref, that._nsResolver,
                                0, null);
    } catch (x) {
      log.error(x);
    }
    log.debug("XPathResult="+result.resultType);

    switch (result.resultType) {
    case result.NUMBER_TYPE:
      return result.numberValue;
    case result.STRING_TYPE:
      return result.stringValue;
    case result.BOOLEAN_TYPE:
      return result.booleanValue;
    } // else 4, UNORDERED_NODE_ITERATOR_TYPE

    var list = [];
    try {
      for (let node = result.iterateNext(); node; node = result.iterateNext()) {
        log.debug("node="+node.nodeName);
        switch (node.nodeType) {
        case node.ATTRIBUTE_NODE:
          list.push(node.value);
          break;
        case node.TEXT_NODE:
          list.push(node.data);
          break;
        default:
          list.push(node);
        }
      }
    } catch (x) {
      log.error(x);
    }

    log.debug("len="+list.length);
    return list;
  },

  /*
   * keep a long-living reference to the returned timer, if you don't want to
   * see it GC'ed ! see
   * http://www.joshmatthews.net/blog/2011/03/nsitimer-anti-pattern/
   */
  timer: function(delay, timerType, callback) {
    var timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    timer.initWithCallback({ notify: callback },
      delay, timerType);
    return timer;
  },

  /*
   * Extracts statements from functions. Intended for feeding a 'oncommand'
   * attribute.
   * BUG: |let| assignations break oncommand inline callback under TB27
   * The statements should probably be limited to a single function call.
   */
  bodyToString: function(func) {
    let matches = func.toSource().match(/\{([\s\S]*)\}/m);
    return matches ? matches[1] : matches;
  }

};

////////////////////////// more fundamental helpers //////////////////////////

firetray.js = {
  // http://stackoverflow.com/questions/767486/how-do-you-check-if-a-variable-is-an-array-in-javascript
  isArray: function(o) {
    return this.getType(o) === '[object Array]';
  },
  getType: function(thing) {
    if(thing === null) return "[object Null]"; // special case
    return Object.prototype.toString.call(thing);
  },

  // http://stackoverflow.com/questions/679915/how-do-i-test-for-an-empty-javascript-object-from-json
  isEmpty: function(obj) {
    for(var prop in obj) {
      if(obj.hasOwnProperty(prop))
        return false;
    }
    return true;
  },

  // values of different ctypes objects can never be compared. See:
  // https://developer.mozilla.org/en/js-ctypes/Using_js-ctypes/Working_with_data#Quirks_in_equality
  strEquals: function(obj1, obj2) {
    return obj1.toString() === obj2.toString();
  },

  assert: function(condition, message) {
    if (!condition) {
      throw new Error(message || "Assertion failed");
    }
  },

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_Objects#Enumerating_all_properties_of_an_object
  listAllProperties: function(obj){
    var objectToInspect;
    var result = [];
    for(objectToInspect = obj; objectToInspect !== null; objectToInspect = Object.getPrototypeOf(objectToInspect)){
      result = result.concat(Object.getOwnPropertyNames(objectToInspect));
    }
    return result;
  },

  floatToInt: function(nb) { return nb >> 0; } // bitwise ops on signed int

};

// http://stackoverflow.com/questions/18912/how-to-find-keys-of-a-hash
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Object/keys
if(!Object.keys) Object.keys = function(o){
  if (o !== Object(o))
    throw new TypeError('Object.keys called on non-object');
  var ret=[],p;
  for(p in o) if(Object.prototype.hasOwnProperty.call(o,p)) ret.push(p);
  return ret;
};

// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/String/Trim
if(!String.prototype.trim) {
  String.prototype.trim = function () {
    return this.replace(/^\s+|\s+$/g,'');
  };
}
