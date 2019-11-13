var EXPORTED_SYMBOLS = [ "user32" ];

const USER32_LIBNAME = "user32";
const USER32_ABIS    = [ "dll" ];

const Cu = Components.utils;

var { ctypes } = ChromeUtils.import("resource://gre/modules/ctypes.jsm");
var { ctypes_library, is64bit, WinCbABI } = ChromeUtils.import("chrome://firetray/content/modules/ctypes/ctypes-utils.jsm");
var { win32 } = ChromeUtils.import("chrome://firetray/content/modules/ctypes/winnt/win32.jsm");

function user32_defines(lib) {

  this.CHANGEFILTERSTRUCT = ctypes.StructType("CHANGEFILTERSTRUCT", [
    { "cbSize": win32.DWORD },
    { "ExtStatus": win32.DWORD }
  ]);
  this.MSGFLTINFO_NONE                     = 0;
  this.MSGFLTINFO_ALLOWED_HIGHER           = 3;
  this.MSGFLTINFO_ALREADYALLOWED_FORWND    = 1;
  this.MSGFLTINFO_ALREADYDISALLOWED_FORWND = 2;

  lib.lazy_bind("ChangeWindowMessageFilter", win32.BOOL, win32.UINT, win32.DWORD);
  this.MSGFLT_ADD    = 1;
  this.MSGFLT_REMOVE = 2;
  lib.lazy_bind("ChangeWindowMessageFilterEx", win32.BOOL, win32.HWND, win32.UINT, win32.DWORD, this.CHANGEFILTERSTRUCT.ptr);
  this.MSGFLT_ALLOW    = 1;
  this.MSGFLT_DISALLOW = 2;
  this.MSGFLT_RESET    = 0;

  lib.lazy_bind("RegisterWindowMessageW", win32.UINT, win32.LPCTSTR);
  lib.lazy_bind("GetWindowTextW", ctypes.int, win32.HWND, win32.LPTSTR, ctypes.int);
  lib.lazy_bind("FindWindowW", win32.HWND, win32.LPCTSTR, win32.LPCTSTR);

  lib.lazy_bind("PostMessageW", win32.BOOL, win32.HWND, win32.UINT, win32.WPARAM, win32.LPARAM);
  lib.lazy_bind("SendMessageW", win32.LRESULT, win32.HWND, win32.UINT, win32.WPARAM, win32.LPARAM);
  this.WM_GETICON = 0x007F;
  this.WM_SETICON = 0x0080;
  this.ICON_SMALL  = 0;
  this.ICON_BIG    = 1;
  this.ICON_SMALL2 = 2;

  lib.lazy_bind("GetClassLongPtrW", win32.ULONG_PTR, win32.HWND, ctypes.int);
  lib.lazy_bind("GetClassLongW", win32.DWORD, win32.HWND, ctypes.int); // 32-bits
  this.GetClassLong = is64bit ? this.GetClassLongPtrW : this.GetClassLongW;
  this.GCLP_HICONSM = -34;

  lib.lazy_bind("LoadIconW", win32.HICON, win32.HINSTANCE, win32.LPCTSTR); // superseeded by LoadImage
  this.IDI_APPLICATION = win32.MAKEINTRESOURCE(32512);
  this.IDI_HAND        = win32.MAKEINTRESOURCE(32513);
  this.IDI_QUESTION    = win32.MAKEINTRESOURCE(32514);
  this.IDI_EXCLAMATION = win32.MAKEINTRESOURCE(32515);
  this.IDI_ASTERISK    = win32.MAKEINTRESOURCE(32516);
  lib.lazy_bind("DestroyIcon", win32.BOOL, win32.HICON);
  lib.lazy_bind("LoadImageW", win32.HANDLE, win32.HINSTANCE, win32.LPCTSTR, win32.UINT, ctypes.int, ctypes.int, win32.UINT);
  this.IMAGE_BITMAP        = 0;
  this.IMAGE_ICON          = 1;
  this.IMAGE_CURSOR        = 2;
  this.LR_CREATEDIBSECTION = 0x00002000;
  this.LR_DEFAULTCOLOR     = 0x00000000;
  this.LR_DEFAULTSIZE      = 0x00000040;
  this.LR_LOADFROMFILE     = 0x00000010;
  this.LR_LOADMAP3DCOLORS  = 0x00001000;
  this.LR_LOADTRANSPARENT  = 0x00000020;
  this.LR_MONOCHROME       = 0x00000001;
  this.LR_SHARED           = 0x00008000;
  this.LR_VGACOLOR         = 0x00000080;
  lib.lazy_bind("CopyImage", win32.HANDLE, win32.HANDLE, win32.UINT, ctypes.int, ctypes.int, win32.UINT);

  lib.lazy_bind("GetPropW", win32.HANDLE, win32.HWND, win32.LPCTSTR);
  lib.lazy_bind("SetPropW", win32.BOOL, win32.HWND, win32.LPCTSTR, win32.HANDLE);
  lib.lazy_bind("RemovePropW", win32.HANDLE, win32.HWND, win32.LPCTSTR);

  lib.lazy_bind("GetWindowLongW", win32.LONG_PTR, win32.HWND, ctypes.int);
  lib.lazy_bind("SetWindowLongW", win32.LONG_PTR , win32.HWND, ctypes.int, win32.LONG_PTR);
  // SetWindowLongPtrW aliases SetWindowLongW with the correct signature thank
  // win32.LONG_PTR
  //
  // x86_64 needs GetWindowLongPtrW instead of SetWindowLongW
  lib.lazy_bind("GetWindowLongPtrW", win32.LONG_PTR, win32.HWND, ctypes.int);
  lib.lazy_bind("SetWindowLongPtrW", win32.LONG_PTR, win32.HWND, ctypes.int, win32.LONG_PTR);
  this.GWLP_WNDPROC   = -4;
  this.GWLP_HINSTANCE = -6;
  this.GWLP_ID        = -12;
  this.GWL_STYLE      = -16;
  this.GWL_EXSTYLE    = -20;
  this.GWLP_USERDATA  = -21;
  lib.lazy_bind("SetClassLongW", win32.DWORD , win32.HWND, ctypes.int, win32.LONG); // superseeded by SetClassLongPtrW
  this.GCL_MENUNAME      = -8;
  this.GCL_HBRBACKGROUND = -10;
  this.GCL_HCURSOR       = -12;
  this.GCL_HICON         = -14;
  this.GCL_HMODULE       = -16;
  this.GCL_CBWNDEXTRA    = -18;
  this.GCL_CBCLSEXTRA    = -20;
  this.GCL_WNDPROC       = -24;
  this.GCL_HICONSM       = -34;

  this.WNDPROC = ctypes.FunctionType(
    WinCbABI, win32.LRESULT,
    [win32.HWND, win32.UINT, win32.WPARAM, win32.LPARAM]).ptr;

  lib.lazy_bind("CallWindowProcW", win32.LRESULT, this.WNDPROC, win32.HWND, win32.UINT, win32.WPARAM, win32.LPARAM);
  lib.lazy_bind("DefWindowProcW", win32.LRESULT, win32.HWND, win32.UINT, win32.WPARAM, win32.LPARAM);

  this.WNDCLASSEXW = ctypes.StructType("WNDCLASSEXW", [
    { "cbSize": win32.UINT },
    { "style": win32.UINT },
    { "lpfnWndProc": this.WNDPROC },
    { "cbClsExtra": ctypes.int },
    { "cbWndExtra": ctypes.int },
    { "hInstance": win32.HINSTANCE },
    { "hIcon": win32.HICON },
    { "hCursor": win32.HCURSOR },
    { "hbrBackground": win32.HBRUSH },
    { "lpszMenuName": win32.LPCTSTR },
    { "lpszClassName": win32.LPCTSTR },
    { "hIconSm": win32.HICON }
  ]);

  lib.lazy_bind("RegisterClassExW", win32.ATOM, this.WNDCLASSEXW.ptr);
  lib.lazy_bind("UnregisterClassW", win32.BOOL, win32.LPCTSTR, win32.HINSTANCE);
  lib.lazy_bind("CreateWindowExW", win32.HWND, win32.DWORD, win32.LPCTSTR, win32.LPCTSTR, win32.DWORD, ctypes.int, ctypes.int, ctypes.int, ctypes.int, win32.HWND, win32.HMENU, win32.HINSTANCE, win32.LPVOID);
  lib.lazy_bind("DestroyWindow", win32.BOOL, win32.HWND);
  lib.lazy_bind("ShowWindow", win32.BOOL, win32.HWND, ctypes.int);
  lib.lazy_bind("IsWindowVisible", win32.BOOL, win32.HWND);
  lib.lazy_bind("IsIconic", win32.BOOL, win32.HWND);

  this.SW_HIDE            = 0;
  this.SW_SHOWNORMAL      = 1;
  this.SW_NORMAL          = 1;
  this.SW_SHOWMINIMIZED   = 2;
  this.SW_SHOWMAXIMIZED   = 3;
  this.SW_MAXIMIZE        = 3;
  this.SW_SHOWNOACTIVATE  = 4;
  this.SW_SHOW            = 5;
  this.SW_MINIMIZE        = 6;
  this.SW_SHOWMINNOACTIVE = 7;
  this.SW_SHOWNA          = 8;
  this.SW_RESTORE         = 9;
  this.SW_SHOWDEFAULT     = 10;
  this.SW_FORCEMINIMIZE   = 11;
  this.SW_MAX             = 11;

  this.CW_USEDEFAULT = ctypes.int(0x80000000); // -2147483648

  this.HWND_BROADCAST = win32.HWND(0xffff);
  this.HWND_MESSAGE   = win32.HWND(-3); // WINVER >= 0x0500

  // need to be win32.DWORD()'d after binray operations are applied !
  this.WS_BORDER           = 0x00800000;
  this.WS_CAPTION          = 0x00C00000;
  this.WS_CHILD            = 0x40000000;
  this.WS_CHILDWINDOW      = 0x40000000;
  this.WS_CLIPCHILDREN     = 0x02000000;
  this.WS_CLIPSIBLINGS     = 0x04000000;
  this.WS_DISABLED         = 0x08000000;
  this.WS_DLGFRAME         = 0x00400000;
  this.WS_GROUP            = 0x00020000;
  this.WS_HSCROLL          = 0x00100000;
  this.WS_ICONIC           = 0x20000000;
  this.WS_MAXIMIZE         = 0x01000000;
  this.WS_MAXIMIZEBOX      = 0x00010000;
  this.WS_MINIMIZE         = 0x20000000;
  this.WS_MINIMIZEBOX      = 0x00020000;
  this.WS_OVERLAPPED       = 0x00000000;
  this.WS_POPUP            = 0x80000000;
  this.WS_SIZEBOX          = 0x00040000;
  this.WS_SYSMENU          = 0x00080000;
  this.WS_TABSTOP          = 0x00010000;
  this.WS_THICKFRAME       = 0x00040000;
  this.WS_TILED            = 0x00000000;
  this.WS_VISIBLE          = 0x10000000;
  this.WS_VSCROLL          = 0x00200000;
  this.WS_POPUPWINDOW      = (this.WS_POPUP | this.WS_BORDER | this.WS_SYSMENU);
  this.WS_OVERLAPPEDWINDOW = (this.WS_OVERLAPPED | this.WS_CAPTION | this.WS_SYSMENU | this.WS_THICKFRAME | this.WS_MINIMIZEBOX | this.WS_MAXIMIZEBOX);
  this.WS_TILEDWINDOW      = (this.WS_OVERLAPPED | this.WS_CAPTION | this.WS_SYSMENU | this.WS_THICKFRAME | this.WS_MINIMIZEBOX | this.WS_MAXIMIZEBOX);

  this.CWPSTRUCT = ctypes.StructType("CWPSTRUCT", [
    { "lParam": win32.LPARAM },
    { "wParam": win32.WPARAM },
    { "message": win32.UINT },
    { "hwnd": win32.HWND }
  ]);

  this.CWPRETSTRUCT = ctypes.StructType("CWPRETSTRUCT", [
    { "lResult": win32.LRESULT },
    { "lParam": win32.LPARAM },
    { "wParam": win32.WPARAM },
    { "message": win32.UINT },
    { "hwnd": win32.HWND }
  ]);

  this.MSG = ctypes.StructType("MSG", [
   { "hwnd": win32.HWND },
   { "message": win32.UINT },
   { "wParam": win32.WPARAM },
   { "lParam": win32.LPARAM },
   { "time": win32.DWORD },
   { "pt": win32.POINT }
  ]);
  this.PMSG = this.MSG.ptr;

  this.HOOKPROC = ctypes.FunctionType(
    WinCbABI, win32.LRESULT,
    [ctypes.int, win32.WPARAM, win32.LPARAM]).ptr;

  lib.lazy_bind("SetWindowsHookExW", win32.HHOOK, ctypes.int, this.HOOKPROC, win32.HINSTANCE, win32.DWORD);
  lib.lazy_bind("CallNextHookEx", win32.LRESULT, win32.HHOOK, ctypes.int, win32.WPARAM, win32.LPARAM);
  lib.lazy_bind("UnhookWindowsHookEx", win32.BOOL, win32.HHOOK);

  this.WH_MIN             = (-1);
  this.WH_MSGFILTER       = (-1);
  this.WH_JOURNALRECORD   = 0;
  this.WH_JOURNALPLAYBACK = 1;
  this.WH_KEYBOARD        = 2;
  this.WH_GETMESSAGE      = 3;
  this.WH_CALLWNDPROC     = 4;
  this.WH_CBT             = 5;
  this.WH_SYSMSGFILTER    = 6;
  this.WH_MOUSE           = 7;
  this.WH_HARDWARE        = 8;
  this.WH_DEBUG           = 9;
  this.WH_SHELL           = 10;
  this.WH_FOREGROUNDIDLE  = 11;
  this.WH_CALLWNDPROCRET  = 12;
  this.WH_KEYBOARD_LL     = 13;
  this.WH_MOUSE_LL        = 14;

  this.HC_ACTION      = 0;
  this.HC_GETNEXT     = 1;
  this.HC_SKIP        = 2;
  this.HC_NOREMOVE    = 3;
  this.HC_NOREM       = this.HC_NOREMOVE;
  this.HC_SYSMODALON  = 4;
  this.HC_SYSMODALOFF = 5;

  lib.lazy_bind("GetWindowThreadProcessId", win32.DWORD, win32.HWND, win32.LPDWORD);

  this.FLASHWINFO = ctypes.StructType("FLASHWINFO", [
    { "cbSize": win32.UINT },
    { "hwnd": win32.HWND },
    { "dwFlags": win32.DWORD },
    { "uCount": win32.UINT },
    { "dwTimeout": win32.DWORD }
  ]);
  this.PFLASHWINFO = this.FLASHWINFO.ptr;

  lib.lazy_bind("FlashWindow", win32.BOOL, win32.HWND, win32.BOOL);
  lib.lazy_bind("FlashWindowEx", win32.BOOL, this.PFLASHWINFO);

  this.FLASHW_STOP      = 0;
  this.FLASHW_CAPTION   = 0x00000001;
  this.FLASHW_TRAY      = 0x00000002;
  this.FLASHW_ALL       =(this.FLASHW_CAPTION | this.FLASHW_TRAY);
  this.FLASHW_TIMER     = 0x00000004;
  this.FLASHW_TIMERNOFG = 0x0000000C;

  lib.lazy_bind("SystemParametersInfoW", win32.BOOL, win32.UINT, win32.UINT, win32.PVOID, win32.UINT);
  this.SPI_GETFOREGROUNDFLASHCOUNT = 0x2004;
  lib.lazy_bind("GetForegroundWindow", win32.HWND);

  lib.lazy_bind("GetDC", win32.HDC, win32.HWND);
  lib.lazy_bind("ReleaseDC", ctypes.int, win32.HWND, win32.HDC);
  lib.lazy_bind("CreateIconIndirect", win32.HICON, win32.PICONINFO);
  lib.lazy_bind("GetClientRect", win32.BOOL, win32.HWND, win32.PRECT);
  lib.lazy_bind("DrawTextW", ctypes.int, win32.HDC, win32.LPCTSTR, ctypes.int, win32.PRECT, win32.UINT);
  this.DT_TOP             = 0x00000000;
  this.DT_LEFT            = 0x00000000;
  this.DT_CENTER          = 0x00000001;
  this.DT_RIGHT           = 0x00000002;
  this.DT_VCENTER         = 0x00000004;
  this.DT_BOTTOM          = 0x00000008;
  this.DT_WORDBREAK       = 0x00000010;
  this.DT_SINGLELINE      = 0x00000020;
  this.DT_EXPANDTABS      = 0x00000040;
  this.DT_TABSTOP         = 0x00000080;
  this.DT_NOCLIP          = 0x00000100;
  this.DT_EXTERNALLEADING = 0x00000200;
  this.DT_CALCRECT        = 0x00000400;
  this.DT_NOPREFIX        = 0x00000800;
  this.DT_INTERNAL        = 0x00001000;

  lib.lazy_bind("CreatePopupMenu", win32.HMENU);
  lib.lazy_bind("DestroyMenu", win32.BOOL, win32.HMENU);

  this.MENUITEMINFOW = ctypes.StructType("MENUITEMINFOW", [
    { "cbSize": win32.UINT },
    { "fMask": win32.UINT },
    { "fType": win32.UINT },
    { "fState": win32.UINT },
    { "wID": win32.UINT },
    { "hSubMenu": win32.HMENU },
    { "hbmpChecked": win32.HBITMAP },
    { "hbmpUnchecked": win32.HBITMAP },
    { "dwItemData": win32.ULONG_PTR },
    { "dwTypeData": win32.LPWSTR },
    { "cch": win32.UINT },
    { "hbmpItem": win32.HBITMAP }
  ]);
  this.LPCMENUITEMINFO = this.LPMENUITEMINFOW = this.MENUITEMINFOW.ptr;

  lib.lazy_bind("InsertMenuItemW", win32.BOOL, win32.HMENU, win32.UINT, win32.BOOL, this.LPCMENUITEMINFO);
  lib.lazy_bind("GetMenuItemInfoW", win32.BOOL, win32.HMENU, win32.UINT, win32.BOOL, this.LPCMENUITEMINFO);

  this.MIIM_STATE      = 0x00000001;
  this.MIIM_ID         = 0x00000002;
  this.MIIM_SUBMENU    = 0x00000004;
  this.MIIM_CHECKMARKS = 0x00000008;
  this.MIIM_TYPE       = 0x00000010;
  this.MIIM_DATA       = 0x00000020;
  this.MIIM_STRING     = 0x00000040;
  this.MIIM_BITMAP     = 0x00000080;
  this.MIIM_FTYPE      = 0x00000100;

  lib.lazy_bind("InsertMenuW", win32.BOOL, win32.HMENU, win32.UINT, win32.UINT, win32.UINT_PTR, win32.LPCTSTR);
  lib.lazy_bind("DeleteMenu", win32.BOOL, win32.HMENU, win32.UINT, win32.UINT);

  this.MF_INSERT          = 0x00000000;
  this.MF_CHANGE          = 0x00000080;
  this.MF_APPEND          = 0x00000100;
  this.MF_DELETE          = 0x00000200;
  this.MF_REMOVE          = 0x00001000;
  this.MF_BYCOMMAND       = 0x00000000;
  this.MF_BYPOSITION      = 0x00000400;
  this.MF_SEPARATOR       = 0x00000800;
  this.MF_ENABLED         = 0x00000000;
  this.MF_GRAYED          = 0x00000001;
  this.MF_DISABLED        = 0x00000002;
  this.MF_UNCHECKED       = 0x00000000;
  this.MF_CHECKED         = 0x00000008;
  this.MF_USECHECKBITMAPS = 0x00000200;
  this.MF_STRING          = 0x00000000;
  this.MF_BITMAP          = 0x00000004;
  this.MF_OWNERDRAW       = 0x00000100;
  this.MF_POPUP           = 0x00000010;
  this.MF_MENUBARBREAK    = 0x00000020;
  this.MF_MENUBREAK       = 0x00000040;
  this.MF_UNHILITE        = 0x00000000;
  this.MF_HILITE          = 0x00000080;
  this.MF_DEFAULT         = 0x00001000;
  this.MF_RIGHTJUSTIFY    = 0x00004000;
  this.MFT_STRING         = this.MF_STRING;
  this.MFT_BITMAP         = this.MF_BITMAP;
  this.MFT_MENUBARBREAK   = this.MF_MENUBARBREAK;
  this.MFT_MENUBREAK      = this.MF_MENUBREAK;
  this.MFT_OWNERDRAW      = this.MF_OWNERDRAW;
  this.MFT_RADIOCHECK     = 0x00000200;
  this.MFT_SEPARATOR      = this.MF_SEPARATOR;
  this.MFT_RIGHTORDER     = 0x00002000;
  this.MFT_RIGHTJUSTIFY   = this.MF_RIGHTJUSTIFY;
  this.MFS_GRAYED         = 0x00000003;
  this.MFS_DISABLED       = this.MFS_GRAYED;
  this.MFS_CHECKED        = this.MF_CHECKED;
  this.MFS_HILITE         = this.MF_HILITE;
  this.MFS_ENABLED        = this.MF_ENABLED;
  this.MFS_UNCHECKED      = this.MF_UNCHECKED;
  this.MFS_UNHILITE       = this.MF_UNHILITE;
  this.MFS_DEFAULT        = this.MF_DEFAULT;

  this.TPM_LEFTBUTTON   = 0x0000;
  this.TPM_RIGHTBUTTON  = 0x0002;
  this.TPM_LEFTALIGN    = 0x0000;
  this.TPM_CENTERALIGN  = 0x0004;
  this.TPM_RIGHTALIGN   = 0x0008;
  this.TPM_TOPALIGN     = 0x0000;
  this.TPM_VCENTERALIGN = 0x0010;
  this.TPM_BOTTOMALIGN  = 0x0020;
  this.TPM_HORIZONTAL   = 0x0000;
  this.TPM_VERTICAL     = 0x0040;

  lib.lazy_bind("GetMenuItemCount", ctypes.int, win32.HMENU);

  lib.lazy_bind("CalculatePopupWindowPosition", win32.BOOL, win32.POINT.ptr, win32.SIZE, win32.UINT, win32.RECT.ptr, win32.RECT.ptr);
  lib.lazy_bind("TrackPopupMenu", win32.BOOL, win32.HMENU, win32.UINT, ctypes.int, ctypes.int, ctypes.int, win32.HWND, win32.RECT.ptr);
  lib.lazy_bind("SetForegroundWindow", win32.BOOL, win32.HWND);
  lib.lazy_bind("GetCursorPos", win32.BOOL, win32.LPPOINT);
  lib.lazy_bind("GetMessagePos", win32.DWORD);

  this.WINDOWINFO = ctypes.StructType("WINDOWINFO", [
   { "cbSize": win32.DWORD },
   { "rcWindow": win32.RECT },
   { "rcClient": win32.RECT },
   { "dwStyle": win32.DWORD },
   { "dwExStyle": win32.DWORD },
   { "dwWindowStatus": win32.DWORD },
   { "cxWindowBorders": win32.UINT },
   { "cyWindowBorders": win32.UINT },
   { "atomWindowType": win32.ATOM },
   { "wCreatorVersion": win32.WORD }
  ]);
  this.PWINDOWINFO = this.LPWINDOWINFO = this.WINDOWINFO.ptr;

  lib.lazy_bind("GetWindowInfo", win32.BOOL, win32.HWND, this.WINDOWINFO.ptr);

  this.WINDOWPLACEMENT = ctypes.StructType("WINDOWPLACEMENT", [
   { "length": win32.UINT },
   { "flags": win32.UINT },
   { "showCmd": win32.UINT },
   { "ptMinPosition": win32.POINT },
   { "ptMaxPosition": win32.POINT },
   { "rcNormalPosition": win32.RECT }
  ]);
  this.PWINDOWPLACEMENT = this.LPWINDOWPLACEMENT = this.WINDOWPLACEMENT.ptr;

  lib.lazy_bind("GetWindowPlacement", win32.BOOL, win32.HWND, this.WINDOWPLACEMENT.ptr);
  lib.lazy_bind("SetWindowPlacement", win32.BOOL, win32.HWND, this.WINDOWPLACEMENT.ptr);

  this.WINDOWPOS = ctypes.StructType("WINDOWPOS", [
   { "hwnd": win32.HWND },
   { "hwndInsertAfter": win32.HWND },
   { "x": ctypes.int },
   { "y": ctypes.int },
   { "cx": ctypes.int },
   { "cy": ctypes.int },
   { "flags": win32.UINT }
  ]);
  this.PWINDOWPOS = this.WINDOWPOS;

  this.SWP_NOSIZE         = 0x0001;
  this.SWP_NOMOVE         = 0x0002;
  this.SWP_NOZORDER       = 0x0004;
  this.SWP_NOREDRAW       = 0x0008;
  this.SWP_NOACTIVATE     = 0x0010;
  this.SWP_FRAMECHANGED   = 0x0020;  /* The frame changed: send WM_NCCALCSIZ= */
  this.SWP_SHOWWINDOW     = 0x0040;
  this.SWP_HIDEWINDOW     = 0x0080;
  this.SWP_NOCOPYBITS     = 0x0100;
  this.SWP_NOOWNERZORDER  = 0x0200;  /* Don't do owner Z orderin= */
  this.SWP_NOSENDCHANGING = 0x0400;  /* Don't send WM_WINDOWPOSCHANGIN= */
  this.SWP_DRAWFRAME      = this.SWP_FRAMECHANGED;
  this.SWP_NOREPOSITION   = this.SWP_NOOWNERZORDER;
  this.SWP_DEFERERASE     = 0x2000;
  this.SWP_ASYNCWINDOWPOS = 0x4000;
  this.SWP_STATECHANGED   = 0x8000;  /* Undocumented */

  lib.lazy_bind("GetSysColor", win32.DWORD, ctypes.int);
  this.COLOR_MENU = 4; 
  
}

new ctypes_library(USER32_LIBNAME, USER32_ABIS, user32_defines, this);
