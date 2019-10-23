var EXPORTED_SYMBOLS = [ "shell32" ];

const SHELL32_LIBNAME = "shell32";
const SHELL32_ABIS    = [ "dll" ];

const Cu = Components.utils;

var { ctypes } = ChromeUtils.import("resource://gre/modules/ctypes.jsm");
var { ctypes_library, is64bit, WinCbABI } = ChromeUtils.import("resource://firetray/ctypes/ctypes-utils.jsm");
var { win32 } = ChromeUtils.import("resource://firetray/ctypes/winnt/win32.jsm");

function shell32_defines(lib) {

  this.NOTIFYICONDATAW = ctypes.StructType("NOTIFYICONDATAW", [
    { "cbSize": win32.DWORD },
    { "hWnd": win32.HWND },
    { "uID": win32.UINT },
    { "uFlags": win32.UINT },
    { "uCallbackMessage": win32.UINT },
    { "hIcon": win32.HICON },
    { "szTip": ctypes.ArrayType(win32.TCHAR, 128) },
    { "dwState": win32.DWORD },
    { "dwStateMask": win32.DWORD },
    { "szInfo": ctypes.ArrayType(win32.TCHAR, 256) },
    { "uTimeoutOrVersion": win32.UINT }, // union
    { "szInfoTitle": ctypes.ArrayType(win32.TCHAR, 64) },
    { "dwInfoFlags": win32.DWORD },
    { "guidItem": win32.GUID },
    { "hBalloonIcon": win32.HICON }
  ]);
  this.NOTIFY_VERSION       = 3; // 2K+
  this.NOTIFYICON_VERSION_4 = 4; // Vista+

  // #define FIELD_OFFSET(t,f) ((LONG)&(((t*)0)->f))
  function FIELD_OFFSET(aType, aField, aPos) {
    function addr2nb(a) {
      return ctypes.cast(a, ctypes.unsigned_long).value;
    }

    // 'would be nice to use aType.ptr(1) (0 raises null pointer error) but we
    // can't access fields (or their size) from a StructType.
    let s = new aType();
    let addr_base = addr2nb(s.address());
    let addr_field;
    if (typeof(aPos) == "undefined") {
      addr_field = addr2nb(s.addressOfField(aField)); // s[aField].address() also fine
    } else {
      addr_field = addr2nb(s[aField].addressOfElement(aPos)); // pfew! nice feature!
    }
    return  addr_field - addr_base;
  }

  this.NOTIFYICONDATAW_V1_SIZE = FIELD_OFFSET(this.NOTIFYICONDATAW, 'szTip', 64); // FIELD_OFFSET(NOTIFYICONDATAW, szTip[64])
  this.NOTIFYICONDATAW_V2_SIZE = FIELD_OFFSET(this.NOTIFYICONDATAW, 'guidItem'); // 2K
  this.NOTIFYICONDATAW_V3_SIZE = FIELD_OFFSET(this.NOTIFYICONDATAW, 'hBalloonIcon'); // XP

  this.NOTIFYICONDATAW_SIZE = function() {
    let cbSize = this.NOTIFYICONDATAW.size;
    if (!win32.WINVER) {
      Cu.reportError("WINVER not defined! shell32 should be initialized before using WINVER.");
    } else if (win32.WINVER >= win32.WIN_VERSIONS["Vista"]) {
      cbSize = this.NOTIFYICONDATAW.size;
    } else if (win32.WINVER >= win32.WIN_VERSIONS["XP"]) {
      cbSize = this.NOTIFYICONDATAW_V3_SIZE;
    } else if (win32.WINVER >= win32.WIN_VERSIONS["2K"]) {
      cbSize = this.NOTIFYICONDATAW_V2_SIZE;
    } else {
      cbSize = this.NOTIFYICONDATAW_V1_SIZE;
    }
    return cbSize;
  };

  lib.lazy_bind("Shell_NotifyIconW", win32.BOOL, win32.DWORD, this.NOTIFYICONDATAW.ptr);

  // notify icon message
  this.NIM_ADD        = 0x00000000;
  this.NIM_MODIFY     = 0x00000001;
  this.NIM_DELETE     = 0x00000002;
  this.NIM_SETFOCUS   = 0x00000003;
  this.NIM_SETVERSION = 0x00000004;

  // for NOTIFYICONDATAW.uFlags
  this.NIF_MESSAGE  = 0x00000001;
  this.NIF_ICON     = 0x00000002;
  this.NIF_TIP      = 0x00000004;
  this.NIF_STATE    = 0x00000008;
  this.NIF_INFO     = 0x00000010;
  this.NIF_GUID     = 0x00000020;
  this.NIF_REALTIME = 0x00000040;
  this.NIF_SHOWTIP  = 0x00000080;

  // for NOTIFYICONDATAW.dwState
  this.NIS_HIDDEN     = 0x00000001;
  this.NIS_SHAREDICON = 0x00000002;

  lib.lazy_bind("ExtractIconW", win32.HICON, win32.HINSTANCE, win32.LPCTSTR, win32.UINT);
  lib.lazy_bind("ExtractIconExW", win32.UINT, win32.LPCTSTR, ctypes.int, win32.HICON.ptr, win32.HICON.ptr, win32.UINT);
}

new ctypes_library(SHELL32_LIBNAME, SHELL32_ABIS, shell32_defines, this);
