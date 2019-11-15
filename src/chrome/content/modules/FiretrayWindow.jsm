// https://developer.mozilla.org/en/Code_snippets/Preferences

var EXPORTED_SYMBOLS = [ "FiretrayWindow" ];

var { firetray } = ChromeUtils.import("chrome://firetray/content/modules/commons.jsm");

var { Logging } = ChromeUtils.import("chrome://firetray/content/modules/logging.jsm");
let log = Logging.getLogger("firetray.FiretrayWindow");

function FiretrayWindow () {}
FiretrayWindow.prototype = {

  getRegisteredWinIdFromChromeWindow: function(win) {
    for (let wid in firetray.Handler.windows)
      if (firetray.Handler.windows[wid].chromeWin === win) return wid;
    log.error("unknown window while lookup");
    return null;
  },

  getWindowTitle: function(wid) {
    let title = firetray.Handler.windows[wid].baseWin.title;
    log.debug("|baseWin.title="+title+"|");
    // FIXME: we should be able to compute the base title from the XUL window
    // attributes.
    const kTailRe = " (-|\u2014) ((Mozilla )?"+firetray.Handler.app.name+"|Nightly)";
    let tailIndex = title.search(kTailRe);
    if (tailIndex !== -1)
      return title.substring(0, tailIndex);
    else
      return title;
  }

};
