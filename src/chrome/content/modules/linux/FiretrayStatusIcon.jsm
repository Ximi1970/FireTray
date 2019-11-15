var EXPORTED_SYMBOLS = [ "firetray" ];

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var { firetray,
      FIRETRAY_GTK
    } = ChromeUtils.import("chrome://firetray/content/modules/commons.jsm");

var { Logging } = ChromeUtils.import("chrome://firetray/content/modules/logging.jsm");
let log = Logging.getLogger("firetray.StatusIcon");


firetray.StatusIcon = {
  initialized: false,
  callbacks: {}, // pointers to JS functions. MUST LIVE DURING ALL THE EXECUTION
  prefAppIconNames: null,
  prefNewMailIconNames: null,
  defaultAppIconName: null,
  defaultNewMailIconName: null,
  
  init: function() {
    log.debug("Init");

    this.initialized = true;
    log.debug("Init Done");
    return true;
  },

}; // firetray.StatusIcon
