var EXPORTED_SYMBOLS = [ "kernel32" ];

const KERNEL32_LIBNAME = "kernel32";
const KERNEL32_ABIS    = [ "dll" ];

const Cu = Components.utils;

var { ctypes } = ChromeUtils.import("resource://gre/modules/ctypes.jsm");
var { ctypes_library, is64bit, WinCbABI } = ChromeUtils.import("resource://firetray/ctypes/ctypes-utils.jsm");
var { win32 } = ChromeUtils.import("resource://firetray/ctypes/winnt/win32.jsm");

function kernel32_defines(lib) {

  this.OSVERSIONINFOEXW = ctypes.StructType("OSVERSIONINFOEXW", [
    { "dwOSVersionInfoSize": win32.DWORD },
    { "dwMajorVersion": win32.DWORD },
    { "dwMinorVersion": win32.DWORD },
    { "dwBuildNumber": win32.DWORD },
    { "dwPlatformId": win32.DWORD },
    { "szCSDVersion": ctypes.ArrayType(win32.TCHAR, 128) },
    { "wServicePackMajor": win32.WORD },
    { "wServicePackMinor": win32.WORD },
    { "wSuiteMask": win32.WORD },
    { "wProductType": win32.BYTE },
    { "wReserved": win32.BYTE }
  ]);

  // lib.lazy_bind("GetLastError", win32.DWORD); // use ctypes.winLastError instead
  lib.lazy_bind("GetVersionExW", win32.BOOL, this.OSVERSIONINFOEXW.ptr);
  lib.lazy_bind("GetConsoleWindow", win32.HWND);
  lib.lazy_bind("GetConsoleTitleW", win32.DWORD, win32.LPTSTR, win32.DWORD);
  lib.lazy_bind("GetModuleHandleW", win32.HMODULE, win32.LPCTSTR);

  lib.lazy_bind("LoadLibraryW", win32.HMODULE, win32.LPCTSTR);
  lib.lazy_bind("GetProcAddress", win32.FARPROC, win32.HMODULE, win32.LPCSTR);
  lib.lazy_bind("GetCurrentThreadId", win32.DWORD);

  this.STARTUPINFO = ctypes.StructType("STARTUPINFO", [
   { "cb": win32.DWORD },
   { "lpReserved": win32.LPTSTR },
   { "lpDesktop": win32.LPTSTR },
   { "lpTitle": win32.LPTSTR },
   { "dwX": win32.DWORD },
   { "dwY": win32.DWORD },
   { "dwXSize": win32.DWORD },
   { "dwYSize": win32.DWORD },
   { "dwXCountChars": win32.DWORD },
   { "dwYCountChars": win32.DWORD },
   { "dwFillAttribute": win32.DWORD },
   { "dwFlags": win32.DWORD },
   { "wShowWindow": win32.WORD  },
   { "cbReserved2": win32.WORD  },
   { "lpReserved2": win32.LPBYTE },
   { "hStdInput": win32.HANDLE },
   { "hStdOutput": win32.HANDLE },
   { "hStdError": win32.HANDLE }
  ]);
  this.LPSTARTUPINFO = ctypes.PointerType(this.STARTUPINFO);

  lib.lazy_bind("GetStartupInfoW", ctypes.void_t, this.LPSTARTUPINFO);

  this.SECURITY_ATTRIBUTES = ctypes.StructType("SECURITY_ATTRIBUTES", [
   { "nLength": win32.DWORD },
   { "lpSecurityDescriptor": win32.LPVOID },
   { "bInheritHandle": win32.BOOL }
  ]);
  this.LPSECURITY_ATTRIBUTES = this.SECURITY_ATTRIBUTES.ptr;
  
  lib.lazy_bind("CreateFileW", win32.HANDLE, win32.LPCWSTR, win32.DWORD, win32.DWORD, this.LPSECURITY_ATTRIBUTES, win32.DWORD, win32.DWORD, win32.HANDLE);
  lib.lazy_bind("ReadFile", win32.BOOL, win32.HANDLE, win32.LPVOID, win32.DWORD, win32.LPDWORD, win32.LPOVERLAPPED);
  lib.lazy_bind("WriteFile", win32.BOOL, win32.HANDLE, win32.LPCVOID, win32.DWORD, win32.LPDWORD,  win32.LPOVERLAPPED);
  lib.lazy_bind("CloseHandle", win32.BOOL, win32.HANDLE);
  lib.lazy_bind("DeleteFileW", win32.BOOL, win32.LPCWSTR);
  
  this.GENERIC_ALL        = 0x10000000;
  this.GENERIC_EXECUTE    = 0x20000000;
  this.GENERIC_WRITE      = 0x40000000;
  this.GENERIC_READ       = 0x80000000;
  
  this.CREATE_NEW         = 1;
  this.CREATE_ALWAYS      = 2;
  this.OPEN_EXISTING      = 3;
  this.OPEN_ALWAYS        = 4;
  this.TRUNCATE_EXISTING  = 5;
  
  this.FILE_ATTRIBUTE_READONLY  = 0x0001
  this.FILE_ATTRIBUTE_HIDDEN    = 0x0002
  this.FILE_ATTRIBUTE_SYSTEM    = 0x0004
  this.FILE_ATTRIBUTE_ARCHIVE   = 0x0020
  this.FILE_ATTRIBUTE_TEMPORARY = 0x0100
  this.FILE_ATTRIBUTE_NORMAL    = 0x0080
  this.FILE_ATTRIBUTE_OFFLINE   = 0x1000
  this.FILE_ATTRIBUTE_ENCRYPTED = 0x4000

}

new ctypes_library(KERNEL32_LIBNAME, KERNEL32_ABIS, kernel32_defines, this);


let osvi = new kernel32.OSVERSIONINFOEXW();
osvi.dwOSVersionInfoSize = kernel32.OSVERSIONINFOEXW.size;
if (kernel32.GetVersionExW(osvi.address())) {
  win32.WINVER = (+osvi.dwMajorVersion)*10 + (+osvi.dwMinorVersion); // ctypes.UInt64 objects!
} else {
  Cu.reportError("win version not found");
}
