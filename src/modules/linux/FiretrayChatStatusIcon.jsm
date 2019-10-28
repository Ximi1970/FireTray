/* -*- Mode: js2; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

var EXPORTED_SYMBOLS = [ "firetray" ];

const Ci = Components.interfaces;

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
var { ctypes } = ChromeUtils.import("resource://gre/modules/ctypes.jsm");
var { firetray,
      FIRETRAY_GTK,
      FIRETRAY_CHAT_ICON_BLINK_STYLE_NORMAL,
      FIRETRAY_CHAT_ICON_BLINK_STYLE_FADE,
      FIRETRAY_IM_STATUS_OFFLINE,
      FIRETRAY_IM_STATUS_AWAY,
      FIRETRAY_IM_STATUS_AVAILABLE,
      FIRETRAY_IM_STATUS_BUSY
    } = ChromeUtils.import("resource://firetray/commons.js"); // first for Handler.app !
var { ctypesMap,
      FIRETRAY_WINDOW_COUNT_MAX,
      DeleteError
    } = ChromeUtils.import("resource://firetray/ctypes/ctypesMap.jsm");
var { gio } = ChromeUtils.import("resource://firetray/ctypes/linux/gio.jsm");
var { gobject, glib } = ChromeUtils.import("resource://firetray/ctypes/linux/gobject.jsm");
var { gdk } = ChromeUtils.import("resource://firetray/ctypes/linux/"+FIRETRAY_GTK+"/gdk.jsm");
var { gtk } = ChromeUtils.import("resource://firetray/ctypes/linux/"+FIRETRAY_GTK+"/gtk.jsm");
var { firetray } = ChromeUtils.import("resource://firetray/linux/FiretrayGtkIcons.jsm");
var { firetray } = ChromeUtils.import("resource://firetray/linux/FiretrayWindow.jsm");

//MR firetray.Handler.subscribeLibsForClosing([gdk, gio, gobject, gtk]);

var { Logging } = ChromeUtils.import("resource://firetray/logging.jsm");
let log = Logging.getLogger("firetray.ChatStatusIcon");

/* //MR
if ("undefined" == typeof(firetray.Handler))
  log.error("This module MUST be imported from/after FiretrayHandler !");
*/

const ALPHA_STEP                       = 5;
const ALPHA_STEP_SLEEP_MILLISECONDS    = 10;
const FADE_OVER_SLEEP_MILLISECONDS     = 500;
const BLINK_TOGGLE_PERIOD_MILLISECONDS = 500;


firetray.ChatStatusIcon = {

  initialized: false,
  trayIcon: null,
  themedIcons: (function(){let o = {};
    o[FIRETRAY_IM_STATUS_AVAILABLE] = null;
    o[FIRETRAY_IM_STATUS_AWAY] = null;
    o[FIRETRAY_IM_STATUS_BUSY] = null;
    o[FIRETRAY_IM_STATUS_OFFLINE] = null;
    return o;
  })(),
  themedIconNameCurrent: null,
  timers: {'blink': null, 'fade-step': null, 'fade-loop': null},
  events: {},
  generators: {},
  pixBuffer: {},
  get isBlinking () {return (firetray.Chat.convsToAcknowledge.length() > 0);},

  init: function() {
    if (!firetray.Handler.appHasChat) throw "ChatStatusIcon for chat app only";

    this.trayIcon = gtk.gtk_status_icon_new();
    firetray.GtkIcons.init();
    this.loadThemedIcons();
    this.setIconImage(this.themedIconNameCurrent || FIRETRAY_IM_STATUS_OFFLINE); // updated in Chat anyway
    this.setIconTooltipDefault();
    this.initTimers();

    this.initialized = true;
    return true;
  },

  shutdown: function() {
    this.destroyTimers();
    this.destroyIcons();
    firetray.GtkIcons.shutdown();
    this.initialized = false;
  },

  loadThemedIcons: function() {
    for (let name in this.themedIcons)
      this.themedIcons[name] = gio.g_themed_icon_new(name);
  },

  destroyIcons: function() {
    for (let name in this.themedIcons) {
      let gicon = this.themedIcons[name];
      gicon = gobject.g_object_unref(gicon);
    }
    gobject.g_object_unref(this.trayIcon);
  },

  setIconImageFromGIcon: function(gicon) {
    if (!firetray.ChatStatusIcon.trayIcon || !gicon)
      log.error("Icon missing");
    gtk.gtk_status_icon_set_from_gicon(firetray.ChatStatusIcon.trayIcon, gicon);
  },

  setIconImage: function(name) {
    this.themedIconNameCurrent = name;

    let blinkStyle = firetray.Utils.prefService.getIntPref("chat_icon_blink_style");
    if (blinkStyle === FIRETRAY_CHAT_ICON_BLINK_STYLE_FADE &&
        this.isBlinking) {
      this.events['icon-changed'] = true;
      return;
    }

    this.setIconImageFromGIcon(this.themedIcons[name]);
  },

  setIconVoid: function() {
    gtk.gtk_status_icon_set_from_pixbuf(this.trayIcon, null);
  },

  initTimers: function() {
    for (let tname in this.timers)
      this.timers[tname] = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
  },

  destroyTimers: function() {
    for (let tname in this.timers) {
      this.timers[tname].cancel();
      this.timers[tname] = null;
    }
    this.events = {};
  },

  buildPixBuf: function() {
    let icon_theme = gtk.gtk_icon_theme_get_for_screen(gdk.gdk_screen_get_default());

    // get pixbuf
    let arry = gobject.gchar.ptr.array()(2);
    arry[0] = gobject.gchar.array()(firetray.ChatStatusIcon.themedIconNameCurrent);
    arry[1] = null;
    log.debug("icon name="+firetray.ChatStatusIcon.themedIconNameCurrent+", theme="+icon_theme+", arry="+arry);
    let icon_info = gtk.gtk_icon_theme_choose_icon(icon_theme, arry, 22, gtk.GTK_ICON_LOOKUP_FORCE_SIZE);

    // create pixbuf
    let pixbuf = gdk.gdk_pixbuf_copy(gtk.gtk_icon_info_load_icon(icon_info, null));
if (gtk.gtk_get_major_version() == 3 && gtk.gtk_get_minor_version() >= 8) { // gtk3
    gobject.g_object_unref(icon_info);
} else {
    gtk.gtk_icon_info_free(icon_info);
}

    // checks
    if (gdk.gdk_pixbuf_get_colorspace(pixbuf) != gdk.GDK_COLORSPACE_RGB)
      log.error("wrong colorspace for pixbuf");
    if (gdk.gdk_pixbuf_get_bits_per_sample(pixbuf) != 8)
      log.error("wrong bits_per_sample for pixbuf");
    if (!gdk.gdk_pixbuf_get_has_alpha(pixbuf))
      log.error("pixbuf doesn't have alpha");
    let n_channels = gdk.gdk_pixbuf_get_n_channels(pixbuf);
    if (n_channels != 4)
      log.error("wrong nb of channels for pixbuf");

    // init transform
    let width = gdk.gdk_pixbuf_get_width(pixbuf);
    let height = gdk.gdk_pixbuf_get_height(pixbuf);
    log.debug("width="+width+", height="+height);
    let length = width*height*n_channels;
    let pixels = ctypes.cast(gdk.gdk_pixbuf_get_pixels(pixbuf),
                             gobject.guchar.array(length).ptr);
    log.debug("pixels="+pixels);

    // backup alpha for later fade-in
    let buffer = new ArrayBuffer(width*height);
    let alpha_bak = new Uint8Array(buffer);
    for (let i=3; i<length; i+=n_channels)
      alpha_bak[(i-3)/n_channels] = pixels.contents[i];

    log.debug("pixbuf created");
    this.pixBuffer = {
      pixbuf: pixbuf,           // TO BE UNREFED WITH to g_object_unref() !!
      width: width,
      height: height,
      length: length,
      n_channels: n_channels,
      pixels: pixels,
      buffer: buffer,
      alpha_bak: alpha_bak
    };
  },
  dropPixBuf: function() {
    gobject.g_object_unref(this.pixBuffer.pixbuf);
    log.debug("pixbuf unref'd");
    this.pixBuffer = {};
  },

  fadeGenerator: function*() {
    let pixbuf = firetray.ChatStatusIcon.pixBuffer;

    for (let a=255; a>0; a-=ALPHA_STEP) {
      for(let i=3; i<pixbuf.length; i+=pixbuf.n_channels)
        if (pixbuf.pixels.contents[i]-ALPHA_STEP>0)
          pixbuf.pixels.contents[i] -= ALPHA_STEP;
      gtk.gtk_status_icon_set_from_pixbuf(firetray.ChatStatusIcon.trayIcon, pixbuf.pixbuf);
      yield true;
    }

    for (let a=255; a>0; a-=ALPHA_STEP) {
      for(let i=3; i<pixbuf.length; i+=pixbuf.n_channels)
        if (pixbuf.pixels.contents[i]+ALPHA_STEP<=pixbuf.alpha_bak[(i-3)/pixbuf.n_channels]) {
          pixbuf.pixels.contents[i] += ALPHA_STEP;
        }
      gtk.gtk_status_icon_set_from_pixbuf(firetray.ChatStatusIcon.trayIcon, pixbuf.pixbuf);
      yield true;
    }
  },

  fadeStep: function() {
    try {
      if (firetray.ChatStatusIcon.generators['fade'].next())
        firetray.ChatStatusIcon.timers['fade-step'].initWithCallback(
          { notify: firetray.ChatStatusIcon.fadeStep },
          ALPHA_STEP_SLEEP_MILLISECONDS, Ci.nsITimer.TYPE_ONE_SHOT);

    } catch (e) {
      if (e instanceof StopIteration) {
        if (firetray.ChatStatusIcon.events['stop-fade']) {
            log.debug("stop-fade");
            delete firetray.ChatStatusIcon.events['stop-fade'];
            delete firetray.ChatStatusIcon.generators['fade'];
            firetray.ChatStatusIcon.setIconImage(firetray.ChatStatusIcon.themedIconNameCurrent);
            firetray.ChatStatusIcon.dropPixBuf();
            return;
        }

        if (firetray.ChatStatusIcon.events['icon-changed']) {
            delete firetray.ChatStatusIcon.events['icon-changed'];
            firetray.ChatStatusIcon.dropPixBuf();
            firetray.ChatStatusIcon.buildPixBuf();
            firetray.ChatStatusIcon.timers['fade-loop'].initWithCallback(
            { notify: firetray.ChatStatusIcon.fadeLoop },
            FADE_OVER_SLEEP_MILLISECONDS, Ci.nsITimer.TYPE_ONE_SHOT);

        } else {
            firetray.ChatStatusIcon.timers['fade-loop'].initWithCallback(
            { notify: firetray.ChatStatusIcon.fadeLoop },
            FADE_OVER_SLEEP_MILLISECONDS, Ci.nsITimer.TYPE_ONE_SHOT);
        }
      }
    };
  },

  fadeLoop: function() {
    firetray.ChatStatusIcon.generators['fade'] = firetray.ChatStatusIcon.fadeGenerator();
    firetray.ChatStatusIcon.fadeStep();
  },

  startFading: function() {
    log.debug("startFading");
    this.buildPixBuf();
    this.fadeLoop();
  },

  stopFading: function() {
    log.debug("stopFading");
    this.events['stop-fade'] = true;
  },

  startBlinking: function() { // gtk_status_icon_set_blinking() deprecated
    this.on = true;
    firetray.ChatStatusIcon.timers['blink'].initWithCallback({
      notify: function() {
        if (firetray.ChatStatusIcon.on)
          firetray.ChatStatusIcon.setIconVoid();
        else
          firetray.ChatStatusIcon.setIconImage(firetray.ChatStatusIcon.themedIconNameCurrent);
        firetray.ChatStatusIcon.on = !firetray.ChatStatusIcon.on;
      }
    }, BLINK_TOGGLE_PERIOD_MILLISECONDS, Ci.nsITimer.TYPE_REPEATING_SLACK);
  },

  stopBlinking: function() {
    log.debug("stopBlinking");
    this.timers['blink'].cancel();
    this.setIconImage(firetray.ChatStatusIcon.themedIconNameCurrent);
    this.on = false;
  },

  toggleBlinkStyle: function(blinkStyle) {
    switch (blinkStyle) {
    case FIRETRAY_CHAT_ICON_BLINK_STYLE_NORMAL:
      this.stopFading();
      this.startBlinking();
      break;
    case FIRETRAY_CHAT_ICON_BLINK_STYLE_FADE:
      this.stopBlinking();
      this.startFading();
      break;
    default:
      throw new Error("Undefined chat icon blink style.");
    }
  },

  setUrgency: function(xid, urgent) {
    gtk.gtk_window_set_urgency_hint(firetray.Handler.gtkWindows.get(xid), urgent);
  },

  setIconTooltip: function(txt) {
    if (!this.trayIcon) return false;
    gtk.gtk_status_icon_set_tooltip_text(this.trayIcon, txt);
    return true;
  },

  setIconTooltipDefault: function() {
    this.setIconTooltip(firetray.Handler.app.name+" Chat");
  }

  // TODO: onclick/activate -> chatHandler.showCurrentConversation()

}; // firetray.ChatStatusIcon
