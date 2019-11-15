var EXPORTED_SYMBOLS = [ "Logging" ];

const FIRETRAY_LOG_LEVEL = "Debug";

const log_levels = ["Off", "Error", "Warn", "Log", "Info", "Debug"];

var Logging = {
  initialized: false,
  level: "Error",

  init: function() {
    if (this.initialized) return;

    this.level = FIRETRAY_LOG_LEVEL;

    this.initialized = true;
  },

  getLogger: function(loggerName){
    return new Logger(loggerName, log_levels.indexOf(this.level));
  }

};  // Logging

 
function Logger(name,level) {
    
  this.name = name;
  this.level = level;
  
  this.debug = function(str) {
    if (level > 4) {
      console.debug(this.name+"\t\t"+str);
    }
  };
  
  this.info = function(str) {
    if (level > 3) {
      console.info(this.name+"\t\t"+str);
    }
  };
  
  this.log = function(str) {
    if (level > 2) {
      console.log(this.name+"\t\t"+str);
    }
  };
  
  this.warn = function(str) {
    if (level > 1) {
      console.warn(this.name+"\t\t"+str);
    }
  };
  
  this.error = function(str) {
    if (level > 0) {
      console.error(this.name+"\t\t"+str);
    }
  };

};
