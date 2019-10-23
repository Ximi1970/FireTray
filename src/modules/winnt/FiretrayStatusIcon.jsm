/* -*- Mode: js2; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

/* The tray icon for the main app. We need a hidden proxy window as (1) we want
 a unique icon, (2) the icon sends notifications to a single window. */

var EXPORTED_SYMBOLS = [ "firetray" ];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
var { ctypes } = ChromeUtils.import("resource://gre/modules/ctypes.jsm");
Cu.import("resource://gre/modules/osfile.jsm");
Cu.import("resource://firetray/ctypes/ctypesMap.jsm");
Cu.import("resource://firetray/ctypes/winnt/win32.jsm");
Cu.import("resource://firetray/ctypes/winnt/gdi32.jsm");
Cu.import("resource://firetray/ctypes/winnt/kernel32.jsm");
Cu.import("resource://firetray/ctypes/winnt/shell32.jsm");
Cu.import("resource://firetray/ctypes/winnt/user32.jsm");
Cu.import("resource://firetray/winnt/FiretrayWin32.jsm");
Cu.import("resource://firetray/commons.js");
Cu.import("resource://firetray/icons.jsm");
firetray.Handler.subscribeLibsForClosing([gdi32, kernel32, shell32, user32]);

var { Logging } = ChromeUtils.import("resource://firetray/logging.jsm");
let log = Logging.getLogger("firetray.StatusIcon");

if ("undefined" == typeof(firetray.Handler))
  log.error("This module MUST be imported from/after FiretrayHandler !");


firetray.StatusIcon = {
  initialized: false,
  callbacks: {}, // pointers to JS functions. MUST LIVE DURING ALL THE EXECUTION
  notifyIconData: null,
  hwndProxy: null,
  WNDCLASS_NAME: "FireTrayHiddenWindowClass",
  WNDCLASS_ATOM: null,
  icons: (function(){return new ctypesMap(win32.HICON);})(),
  bitmaps: (function(){return new ctypesMap(win32.HBITMAP);})(),
  IMG_TYPES: {
    ico: { win_t: win32.HICON,   load_const: user32.IMAGE_ICON,   map: 'icons' },
    bmp: { win_t: win32.HBITMAP, load_const: user32.IMAGE_BITMAP, map: 'bitmaps' }
  },
  PREF_TO_ICON_NAME: {
    app_icon_custom: 'app-custom',
    mail_icon_custom: 'mail-custom'
  },

  init: function() {
    this.loadImages();
    this.create();
    firetray.Handler.setIconImageDefault();

    Cu.import("resource://firetray/winnt/FiretrayPopupMenu.jsm");
    if (!firetray.PopupMenu.init())
      return false;

    this.initialized = true;
    return true;
  },

  shutdown: function() {
    log.debug("Disabling StatusIcon");
    firetray.PopupMenu.shutdown();

    this.destroy();
    this.destroyImages();

    this.initialized = false;
    return true;
  },

  loadImages: function() {
    let topmost = firetray.Handler.getWindowInterface(
      Services.wm.getMostRecentWindow(null), "nsIBaseWindow");
    let hwnd = firetray.Win32.hexStrToHwnd(topmost.nativeHandle);
    log.debug("topmost or hiddenWin hwnd="+hwnd);
    this.icons.insert('app', this.getIconFromWindow(hwnd));
    ['app_icon_custom', 'mail_icon_custom'].forEach(function(elt) {
      firetray.StatusIcon.loadImageCustom(elt);
    });

    /* we'll take the first icon in the .ico file. To get the icon count in the
     file, pass ctypes.cast(ctypes.int(-1), win32.UINT); */
    for (let imgName in EMBEDDED_ICON_FILES) {
      let path = OS.Path.join(OS.Constants.Path.tmpDir, imgName+'.'+EMBEDDED_ICON_FILES[imgName].type);
      log.debug("Path: "+path);
    
      let byte_buf = ctypes.unsigned_char.array()(EMBEDDED_ICON_FILES[imgName].bin);
      let hFile = kernel32.CreateFileW(path, kernel32.GENERIC_WRITE, 0, null, kernel32.CREATE_ALWAYS, kernel32.FILE_ATTRIBUTE_NORMAL, null);
      let written = new win32.DWORD;
      let status = kernel32.WriteFile(hFile, byte_buf, byte_buf.length, written.address(), null);
      status = kernel32.CloseHandle(hFile);

      let img = this.loadImageFromFile(path);

      if (img && EMBEDDED_ICON_FILES[imgName].use == 'menu')
        /* Ideally we should rebuild the menu each time it is shown as the menu
         color may change. But let's just consider it's not worth it for
         now. */
        img.himg = this.makeBitMapTransparent(img.himg);
      if (img) {
        log.debug("Img Type: "+img['type']);
        log.debug("Img hImg: "+img['himg']);

        this[this.IMG_TYPES[img['type']]['map']].insert(imgName, img['himg']);
      }
    }
  },

  loadImageCustom: function(prefname) {
    log.debug("loadImageCustom pref="+prefname);
    let filename = firetray.Utils.prefService.getCharPref(prefname);
    if (!filename) return;
    let img = this.loadImageFromFile(filename);
    if (!img) return;

    log.debug("loadImageCustom img type="+img['type']+" himg="+img['himg']);
    let hicon = img['himg'];
    if (img['type'] === 'bmp')
      hicon = this.HBITMAPToHICON(img['himg']);
    let name = this.PREF_TO_ICON_NAME[prefname];
    log.debug("    name="+name);
    this.icons.insert(name, hicon);
  },

  loadImageFromFile: function(path) {
    let imgType = path.substr(-3, 3).toLowerCase();
    if (!(imgType in this.IMG_TYPES)) {
      throw Error("Unrecognized type '"+imgType+"'");
    }
    let imgTypeRec = this.IMG_TYPES[imgType];
    let himg = ctypes.cast(
      user32.LoadImageW(null, path, imgTypeRec['load_const'], 16, 16,
                        user32.LR_LOADFROMFILE|user32.LR_SHARED),
      imgTypeRec['win_t']);
    if (himg.isNull()) {
      log.error("Could not load '"+path+"'="+himg+" winLastError="+ctypes.winLastError);
      return null;
    }
    return {type:imgType, himg:himg};
  },

  HBITMAPToHICON: function(hBitmap) {
    log.debug("HBITMAPToHICON hBitmap="+hBitmap);
    let hWnd = null; // firetray.StatusIcon.hwndProxy;
    let hdc = user32.GetDC(hWnd);
    let bitmap = new win32.BITMAP();
    let err = gdi32.GetObjectW(hBitmap, win32.BITMAP.size, bitmap.address()); // get bitmap info
    let hBitmapMask = gdi32.CreateCompatibleBitmap(hdc, bitmap.bmWidth, bitmap.bmHeight);
    user32.ReleaseDC(hWnd, hdc);

    let iconInfo = win32.ICONINFO();
    iconInfo.fIcon = true;
    iconInfo.xHotspot = 0;
    iconInfo.yHotspot = 0;
    iconInfo.hbmMask = hBitmapMask;
    iconInfo.hbmColor = hBitmap;

    let hIcon = user32.CreateIconIndirect(iconInfo.address());
    log.debug("   CreateIconIndirect hIcon="+hIcon+" lastError="+ctypes.winLastError);

    gdi32.DeleteObject(hBitmap);
    gdi32.DeleteObject(hBitmapMask);

    return hIcon;
  },

  // images loaded with LR_SHARED need't be destroyed
  destroyImages: function() {
    [this.icons, this.bitmaps].forEach(function(map, idx, ary) {
      let keys = map.keys;
      for (let i=0, len=keys.length; i<len; ++i) {
        let imgName = keys[i];
        map.remove(imgName);
      }
    });
        
    for (let imgName in EMBEDDED_ICON_FILES) {
      let path = OS.Path.join(OS.Constants.Path.tmpDir, imgName+'.'+EMBEDDED_ICON_FILES[imgName].type);
      kernel32.DeleteFileW(path);
    }

    log.debug("Icons destroyed");
  },

  create: function() {
    let hwnd_hidden = this.createProxyWindow();

    let nid = new shell32.NOTIFYICONDATAW();
    nid.cbSize = shell32.NOTIFYICONDATAW_SIZE();
    log.debug("SIZE="+nid.cbSize);
    nid.szTip = firetray.Handler.app.name;
    nid.hIcon = this.icons.get('app');
    nid.hWnd = hwnd_hidden;
    nid.uCallbackMessage = firetray.Win32.WM_TRAYMESSAGE;
    nid.uFlags = shell32.NIF_MESSAGE | shell32.NIF_ICON | shell32.NIF_TIP |
      shell32.NIF_STATE;
    nid.uVersion = shell32.NOTIFYICON_VERSION_4;

    // Install the icon
    let rv = shell32.Shell_NotifyIconW(shell32.NIM_ADD, nid.address());
    log.debug("Shell_NotifyIcon ADD="+rv+" winLastError="+ctypes.winLastError); // ERROR_INVALID_WINDOW_HANDLE(1400)
    rv = shell32.Shell_NotifyIconW(shell32.NIM_SETVERSION, nid.address());
    log.debug("Shell_NotifyIcon SETVERSION="+rv+" winLastError="+ctypes.winLastError);

    this.notifyIconData = nid;
    this.hwndProxy = hwnd_hidden;
  },

  createProxyWindow: function() {
    this.registerWindowClass();

    let hwnd_hidden = user32.CreateWindowExW(
      0, win32.LPCTSTR(this.WNDCLASS_ATOM), // lpClassName can also be _T(WNDCLASS_NAME)
      "Firetray Message Window", 0,
      user32.CW_USEDEFAULT, user32.CW_USEDEFAULT, user32.CW_USEDEFAULT, user32.CW_USEDEFAULT,
      null, null, firetray.Win32.hInstance, null);
    log.debug("CreateWindow="+!hwnd_hidden.isNull()+" winLastError="+ctypes.winLastError);

    this.callbacks.proxyWndProc = user32.WNDPROC(firetray.StatusIcon.proxyWndProc);
    let procPrev;
    if (firetray.Handler.app.ABI == "x86_64-msvc") {
      procPrev = user32.SetWindowLongPtrW(hwnd_hidden, user32.GWLP_WNDPROC,
                      ctypes.cast(this.callbacks.proxyWndProc, win32.LONG_PTR));
    } else {
      procPrev = user32.SetWindowLongW(hwnd_hidden, user32.GWLP_WNDPROC,
                      ctypes.cast(this.callbacks.proxyWndProc, win32.LONG_PTR));
    }
    log.debug("procPrev="+procPrev+" winLastError="+ctypes.winLastError);

    firetray.Win32.acceptAllMessages(hwnd_hidden);

    return hwnd_hidden;
  },

  registerWindowClass: function() {
    let wndClass = new user32.WNDCLASSEXW();
    wndClass.cbSize = user32.WNDCLASSEXW.size;
    wndClass.lpfnWndProc = ctypes.cast(user32.DefWindowProcW, user32.WNDPROC);
    wndClass.hInstance = firetray.Win32.hInstance;
    wndClass.lpszClassName = win32._T(this.WNDCLASS_NAME);
    this.WNDCLASS_ATOM = user32.RegisterClassExW(wndClass.address());
    log.debug("WNDCLASS_ATOM="+this.WNDCLASS_ATOM);
  },

  proxyWndProc: function(hWnd, uMsg, wParam, lParam) {
    log.debug("ProxyWindowProc CALLED: hWnd="+hWnd+", uMsg="+uMsg+", wParam="+wParam+", lParam="+lParam);

    // FIXME: WM_TASKBARCREATED is needed in case of explorer crash
    // http://twigstechtips.blogspot.fr/2011/02/c-detect-when-windows-explorer-has.html
    if (uMsg === firetray.Win32.WM_TASKBARCREATED) {
      log.info("____________TASKBARCREATED");

    } else if (uMsg === firetray.Win32.WM_TRAYMESSAGE) {

      switch (win32.LOWORD(lParam)) {
      case win32.WM_LBUTTONUP:
        log.debug("WM_LBUTTONUP");
        firetray.Handler.showHideAllWindows();
        break;
      case win32.WM_RBUTTONUP:
        log.debug("WM_RBUTTONUP");
      case win32.WM_CONTEXTMENU:
        log.debug("WM_CONTEXTMENU");
        /* Can't determine tray icon position precisely: the mouse cursor can
         move between WM_RBUTTONDOWN and WM_RBUTTONUP, or the icon can have
         been moved inside the notification area... so we opt for the easy
         solution. */
        let pos = user32.GetMessagePos();
        let xPos = win32.GET_X_LPARAM(pos), yPos = win32.GET_Y_LPARAM(pos);
        log.debug("  x="+xPos+" y="+yPos);
        user32.SetForegroundWindow(hWnd);
        user32.TrackPopupMenu(firetray.PopupMenu.menu, user32.TPM_RIGHTALIGN|user32.TPM_BOTTOMALIGN, xPos, yPos, 0, hWnd, null);
        break;
      case win32.WM_MBUTTONUP:
        log.debug("WM_MBUTTONUP");
        break;
      // case win32.WM_VSCROLL:
      // case win32.WM_MOUSEWHEEL:
        /* getting scroll event from the icon is not straight-forward:
         SetWindowsHookEx, http://stackoverflow.com/a/90793/421846,
         http://www.codeproject.com/Articles/21218/Tray-Me */
      default:
      }

    } else {
      switch (uMsg) {
      case win32.WM_SYSCOMMAND:
        log.debug("WM_SYSCOMMAND wParam="+wParam+", lParam="+lParam);
        break;
      case win32.WM_COMMAND:
        log.debug("WM_COMMAND wParam="+wParam+", lParam="+lParam);
        firetray.PopupMenu.processMenuItem(wParam);
        break;
      case win32.WM_MENUCOMMAND:
        log.debug("WM_MENUCOMMAND wParam="+wParam+", lParam="+lParam);
        break;
      case win32.WM_MENUCHAR:
        log.debug("WM_MENUCHAR wParam="+wParam+", lParam="+lParam);
        break;
      }
    }

    return user32.DefWindowProcW(hWnd, uMsg, wParam, lParam);
  },

  getIconFromWindow: function(hwnd) {
    let rv = user32.SendMessageW(hwnd, user32.WM_GETICON, user32.ICON_SMALL, 0);
    log.debug("SendMessageW winLastError="+ctypes.winLastError);
    // result is a ctypes.Int64. So we need to create a CData from it before
    // casting it to a HICON.
    let icon = ctypes.cast(win32.LRESULT(rv), win32.HICON);
    if (icon.isNull()) { // from the window class
      rv = user32.GetClassLong(hwnd, user32.GCLP_HICONSM);
      icon = ctypes.cast(win32.ULONG_PTR(rv), win32.HICON);
      log.debug("GetClassLong winLastError="+ctypes.winLastError);
    }
    if (icon.isNull()) { // from the first resource -> ERROR_RESOURCE_TYPE_NOT_FOUND(1813)
      icon = user32.LoadIconW(firetray.Win32.hInstance, win32.MAKEINTRESOURCE(0));
      log.debug("LoadIconW module winLastError="+ctypes.winLastError);
    }
    if (icon.isNull()) { // OS default icon
      icon = user32.LoadIconW(null, win32.MAKEINTRESOURCE(user32.IDI_APPLICATION));
      log.debug("LoadIconW default winLastError="+ctypes.winLastError);
    }
    log.debug("=== icon="+icon);
    return icon;
  },

  destroyProxyWindow: function() {
    let rv = user32.DestroyWindow(this.hwndProxy);

    rv = this.unregisterWindowClass();
    log.debug("Hidden window removed");
  },

  unregisterWindowClass: function() {
    return user32.UnregisterClassW(win32.LPCTSTR(this.WNDCLASS_ATOM), firetray.Win32.hInstance);
  },

  destroy: function() {
    let rv = shell32.Shell_NotifyIconW(shell32.NIM_DELETE, this.notifyIconData.address());
    log.debug("Shell_NotifyIcon DELETE="+rv+" winLastError="+ctypes.winLastError);
    this.destroyProxyWindow();
  },

  setIcon: function(iconinfo) {
    let nid = firetray.StatusIcon.notifyIconData;
    if (iconinfo.hicon)
      nid.hIcon = iconinfo.hicon;
    if (iconinfo.tip)
      nid.szTip = iconinfo.tip;
    let rv = shell32.Shell_NotifyIconW(shell32.NIM_MODIFY, nid.address());
    log.debug("Shell_NotifyIcon MODIFY="+rv+" winLastError="+ctypes.winLastError);
  },

  // rgb colors encoded in *bbggrr*
  cssColorToCOLORREF: function(csscolor) {
    let rgb = csscolor.substr(1);
    let rr = rgb.substr(0, 2);
    let gg = rgb.substr(2, 2);
    let bb = rgb.substr(4, 2);
    return parseInt("0x"+bb+gg+rr);
  },

  // http://stackoverflow.com/questions/457050/how-to-display-text-in-system-tray-icon-with-win32-api
  createTextIcon: function(hWnd, text, color) {
    log.debug("createTextIcon hWnd="+hWnd+" text="+text+" color="+color);

    let icon = null;
    let pref = firetray.Utils.prefService.getIntPref("mail_notification_type");
    switch (pref) {
      case FIRETRAY_NOTIFICATION_BLANK_ICON:
        log.debug("setIconText, Name: blank-icon-bmp");
        icon = this.bitmaps.get('blank-icon-bmp');

        break;
      case FIRETRAY_NOTIFICATION_NEWMAIL_ICON:
        log.debug("setIconText, Name: mail-unread-bmp");
        icon = this.bitmaps.get('mail-unread-bmp');

        break;
      case FIRETRAY_NOTIFICATION_CUSTOM_ICON:
        log.debug("setIconText, Name: custom-icon");
        icon = this.bitmaps.get('mail-custom');

        break;
     default:
        log.error("Unknown notification mode: "+pref);
        return;
    }

    let bitmap = new win32.BITMAP();
    let err = gdi32.GetObjectW(icon, win32.BITMAP.size, bitmap.address()); // get bitmap info
    let width = bitmap.bmWidth, height = bitmap.bmHeight;

    let hdc = user32.GetDC(hWnd); // get device context (DC) for hWnd
    let hdcMem = gdi32.CreateCompatibleDC(hdc); // creates a memory device context (DC) compatible with hdc (need a bitmap)
    let hBitmap = user32.CopyImage(icon, user32.IMAGE_BITMAP, width, height, 0);
    let hBitmapMask = gdi32.CreateCompatibleBitmap(hdc, width, height);
    user32.ReleaseDC(hWnd, hdc);

    let hBitmapOrig = gdi32.SelectObject(hdcMem, hBitmap);

    function getFont(fnHeight) {
      return gdi32.CreateFontW(
        fnHeight, 0, 0, 0, gdi32.FW_SEMIBOLD, 0, 0, 0,
        gdi32.ANSI_CHARSET, gdi32.OUT_OUTLINE_PRECIS, 0, gdi32.ANTIALIASED_QUALITY,
        gdi32.FIXED_PITCH|gdi32.FF_SWISS, "Arial"
      );
    }

    let fnHeight = firetray.js.floatToInt(height);
      log.debug("    fnHeight initial="+fnHeight);
    let hFont = getFont(fnHeight);
    gdi32.SelectObject(hdcMem, hFont); // replace font in bitmap by hFont
    { let bufLen = 32, faceName = ctypes.jschar.array()(bufLen); gdi32.GetTextFaceW(hdcMem, bufLen, faceName); log.debug("    font="+faceName); }

    let size = new gdi32.SIZE();
    gdi32.GetTextExtentPoint32W(hdcMem, text, text.length, size.address()); // more reliable than DrawText(DT_CALCRECT)
    while (size.cx > width - 6 || size.cy > height - 4) {
      fnHeight -= 1;
      hFont = getFont(fnHeight);
      gdi32.SelectObject(hdcMem, hFont);
      gdi32.GetTextExtentPoint32W(hdcMem, text, text.length, size.address());
      log.debug("    fnHeight="+fnHeight+" width="+size.cx);
    }

    gdi32.SetTextColor(hdcMem, win32.COLORREF(this.cssColorToCOLORREF(color)));
    gdi32.SetBkMode(hdcMem, gdi32.TRANSPARENT); // VERY IMPORTANT
    gdi32.SetTextAlign(hdcMem, gdi32.TA_TOP|gdi32.TA_CENTER);
    log.debug("   ___ALIGN=(winLastError="+ctypes.winLastError+") "+gdi32.GetTextAlign(hdcMem));

    let nXStart = firetray.js.floatToInt((width - size.cx)/2),
        nYStart = firetray.js.floatToInt((height - size.cy)/2);
    gdi32.TextOutW(hdcMem, width/2, nYStart+2, text, text.length); // ref point for alignment

    gdi32.SelectObject(hdcMem, hBitmapOrig);

    let iconInfo = win32.ICONINFO();
    iconInfo.fIcon = true;
    iconInfo.xHotspot = 0;
    iconInfo.yHotspot = 0;
    iconInfo.hbmMask = hBitmapMask;
    iconInfo.hbmColor = hBitmap;

    let hIcon = user32.CreateIconIndirect(iconInfo.address());
    log.debug("   CreateIconIndirect hIcon="+hIcon+" lastError="+ctypes.winLastError);

    gdi32.DeleteObject(gdi32.SelectObject(hdcMem, hFont));
    gdi32.DeleteDC(hdcMem);
    // gdi32.DeleteDC(hdc); // already ReleaseDC's
    gdi32.DeleteObject(hBitmap);
    gdi32.DeleteObject(hBitmapMask);

    return hIcon;               // to be destroyed (DestroyIcon)
  },

  getIconSafe: function(name) {
    let hicon = null;
    try {
      hicon = firetray.StatusIcon.icons.get(name);
    } catch(error) {
      log.error("icon '"+name+"' not defined.");
    }
    return hicon;
  },

  // http://www.dreamincode.net/forums/topic/281612-how-to-make-bitmaps-on-menus-transparent-in-c-win32/
  makeBitMapTransparent: function(hbmSrc) {
    log.debug("hbmSrc="+hbmSrc);
    let hdcSrc = gdi32.CreateCompatibleDC(null);
    let hdcDst = gdi32.CreateCompatibleDC(null);
    if (!hdcSrc || !hdcSrc) return null;

    let bm = new win32.BITMAP();
    let err = gdi32.GetObjectW(hbmSrc, win32.BITMAP.size, bm.address());
    let hbmOld = ctypes.cast(gdi32.SelectObject(hdcSrc, hbmSrc), win32.HBITMAP);
    let width = bm.bmWidth, height = bm.bmHeight;
    let hbmNew = gdi32.CreateBitmap(width, height, bm.bmPlanes, bm.bmBitsPixel, null);
    gdi32.SelectObject(hdcDst, hbmNew);

    gdi32.BitBlt(hdcDst,0,0,width, height,hdcSrc,0,0,gdi32.SRCCOPY);

    let clrTP = gdi32.GetPixel(hdcDst, 0, 0);          // color of first pixel
    let clrBK = user32.GetSysColor(user32.COLOR_MENU); // current background color

    for (let nRow=0, len=height; nRow<len; ++nRow)
      for (let nCol=0, len=width; nCol<len; ++nCol)
        if (firetray.js.strEquals(gdi32.GetPixel(hdcDst, nCol, nRow), clrTP))
          gdi32.SetPixel(hdcDst, nCol, nRow, clrBK);

    gdi32.DeleteDC(hdcDst);
    gdi32.DeleteDC(hdcSrc);

    return hbmNew;
  }

}; // firetray.StatusIcon

firetray.Handler.loadImageCustom = firetray.StatusIcon.loadImageCustom
  .bind(firetray.StatusIcon);

firetray.Handler.setIconImageDefault = function() {
  log.debug("setIconImageDefault");
  let appIconType = firetray.Utils.prefService.getIntPref("app_icon_type");
  if (appIconType === FIRETRAY_APPLICATION_ICON_TYPE_THEMED)
    firetray.StatusIcon.setIcon({hicon:firetray.StatusIcon.icons.get('app')});
  else if (appIconType === FIRETRAY_APPLICATION_ICON_TYPE_CUSTOM) {
    firetray.StatusIcon.setIcon({hicon:firetray.StatusIcon.getIconSafe('app-custom')});
  }
};

firetray.Handler.setIconImageBlank = function() {
  log.debug("setIconImageBlank");
  firetray.StatusIcon.setIcon({hicon:firetray.StatusIcon.icons.get('blank-icon')});
};

firetray.Handler.setIconImageNewMail = function() {
  log.debug("setIconImageDefault");
  firetray.StatusIcon.setIcon({hicon:firetray.StatusIcon.icons.get('mail-unread')});
};

firetray.Handler.setIconImageCustom = function(prefname) {
  log.debug("setIconImageCustom pref="+prefname);
  let name = firetray.StatusIcon.PREF_TO_ICON_NAME[prefname];
  firetray.StatusIcon.setIcon({hicon:firetray.StatusIcon.getIconSafe(name)});
};

// firetray.Handler.setIconImageFromFile = firetray.StatusIcon.setIconImageFromFile;

firetray.Handler.setIconTooltip = function(toolTipStr) {
  log.debug("setIconTooltip");
  firetray.StatusIcon.setIcon({tip:toolTipStr});
};

firetray.Handler.setIconTooltipDefault = function() {
  log.debug("setIconTooltipDefault");
  firetray.StatusIcon.setIcon({tip:this.app.name});
};

firetray.Handler.setIconText = function(text, color) {
  let hicon = firetray.StatusIcon.createTextIcon(
    firetray.StatusIcon.hwndProxy, text, color);
  log.debug("setIconText icon="+hicon);
  if (hicon.isNull())
    log.error("Could not create hicon");
  firetray.StatusIcon.setIcon({hicon:hicon});
};

firetray.Handler.setIconVisibility = function(visible) {
  log.debug("setIconVisibility="+visible);
  let nid = firetray.StatusIcon.notifyIconData;
  if (visible)
    nid.dwState = 0;
  else
    nid.dwState = shell32.NIS_HIDDEN;
  nid.dwStateMask = shell32.NIS_HIDDEN;
  let rv = shell32.Shell_NotifyIconW(shell32.NIM_MODIFY, nid.address());
  log.debug("Shell_NotifyIcon MODIFY="+rv+" winLastError="+ctypes.winLastError);
};
