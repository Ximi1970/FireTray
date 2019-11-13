/* -*- Mode: javascript; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

var EXPORTED_SYMBOLS = [ "libc" ];

const LIBC_LIBNAME = "c";
const LIBC_ABIS    = [ 6 ];

var { ctypes } = ChromeUtils.import("resource://gre/modules/ctypes.jsm");
var { ctypes_library, is64bit, WinCbABI } = ChromeUtils.import("chrome://firetray/content/modules/ctypes/ctypes-utils.jsm");

function libc_defines(lib) {
  this.FILE = ctypes.StructType("FILE");
  // this.stderr = this.fdopen(2, "a");
  this.pid_t = ctypes.int;

  lib.lazy_bind("fdopen", this.FILE.ptr, ctypes.int, ctypes.char.ptr);
  lib.lazy_bind("puts", ctypes.int32_t, ctypes.char.ptr);
  lib.lazy_bind("fputs", ctypes.int32_t, ctypes.char.ptr, this.FILE.ptr);
  lib.lazy_bind("fflush", ctypes.int32_t, this.FILE.ptr);
  lib.lazy_bind("getpid", this.pid_t);
  lib.lazy_bind("strcmp", ctypes.int, ctypes.char.ptr, ctypes.char.ptr);
  lib.lazy_bind("popen", this.FILE.ptr, ctypes.char.ptr, ctypes.char.ptr);
  lib.lazy_bind("pclose", ctypes.int, this.FILE.ptr);
  lib.lazy_bind("fread", ctypes.size_t, ctypes.voidptr_t, ctypes.size_t, ctypes.size_t, this.FILE.ptr);
};

var libc = new ctypes_library(LIBC_LIBNAME, LIBC_ABIS, libc_defines, this);
