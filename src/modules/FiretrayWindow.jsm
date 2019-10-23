/* -*- Mode: js2; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
// https://developer.mozilla.org/en/Code_snippets/Preferences

var EXPORTED_SYMBOLS = [ "FiretrayWindow" ];

var { firetray } = ChromeUtils.import("resource://firetray/commons.js");

var { Logging } = ChromeUtils.import("resource://firetray/logging.jsm");
let log = Logging.getLogger("firetray.FiretrayWindow");

if ("undefined" == typeof(firetray.Handler))
  log.error("This module MUST be imported from/after FiretrayHandler !");

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
