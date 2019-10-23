/* -*- Mode: js2; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

var EXPORTED_SYMBOLS = [ "Logging" ];

const FIRETRAY_LOG_LEVEL = "Debug";

// https://wiki.mozilla.org/Labs/JS_Modules#Logging
var Logging = {
  initialized: false,
  LogMod: null,

  init: function() {
    if (this.initialized) return;

    var { Log } = ChromeUtils.import("resource://gre/modules/Log.jsm");
    this.LogMod = Log
    
    this.setupLogging("firetray2");

    let log = this.getLogger("firetray2.Logging");
    log.debug("initialized");

    this.initialized = true;
  },

  setupLogging: function(loggerName) {
    // Loggers are hierarchical, affiliation is handled by a '.' in the name.
    this._logger = this.LogMod.repository.getLogger(loggerName);
    // Lowering this log level will affect all of our addon output
    this._logger.level = this.LogMod.Level[FIRETRAY_LOG_LEVEL];

    // A console appender outputs to the JS Error Console
    let simpleFormatter = new this.LogMod.BasicFormatter();
    let capp = new this.LogMod.ConsoleAppender(simpleFormatter);
    capp.level = this.LogMod.Level["Debug"];
    this._logger.addAppender(capp);

    // A dump appender outputs to standard out
    let dumpFormatter = new this.LogMod.BasicFormatter();
    let dapp = new this.LogMod.DumpAppender(dumpFormatter);
    dapp.level = this.LogMod.Level["Debug"];
    this._logger.addAppender(dapp);
  },

  getLogger: function(loggerName){
    return this.LogMod.repository.getLogger(loggerName);
  }

};  // Logging
