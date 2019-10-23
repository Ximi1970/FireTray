/* -*- Mode: js2; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

var EXPORTED_SYMBOLS = [ "firetray" ];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/ctypes.jsm");
Cu.import("resource://firetray/ctypes/ctypesMap.jsm");
Cu.import("resource://firetray/ctypes/winnt/kernel32.jsm");
Cu.import("resource://firetray/ctypes/winnt/user32.jsm");
Cu.import("resource://firetray/ctypes/winnt/win32.jsm");
Cu.import("resource://firetray/winnt/FiretrayWin32.jsm");
Cu.import("resource://firetray/FiretrayWindow.jsm");
Cu.import("resource://firetray/commons.js");
firetray.Handler.subscribeLibsForClosing([user32, kernel32]);

var { Logging } = ChromeUtils.import("resource://firetray/logging.jsm");
let log = Logging.getLogger("firetray.Window");

if ("undefined" == typeof(firetray.Handler))
  log.error("This module MUST be imported from/after FiretrayHandler !");

const FIRETRAY_XWINDOW_HIDDEN    = 1 << 0; // when minimized also
const FIRETRAY_XWINDOW_MAXIMIZED = 1 << 1;

// We need to keep long-living references to wndProcs callbacks. As they also
// happen to be ctypes pointers, we store them into real ctypes arrays.
firetray.Handler.wndProcs        = new ctypesMap(win32.LONG_PTR);
firetray.Handler.wndProcsOrig    = new ctypesMap(win32.LONG_PTR);
firetray.Handler.wndProcsStartup = new ctypesMap(win32.LONG_PTR);


firetray.Window = new FiretrayWindow();

firetray.Window.init = function() {
    this.initialized = true;
  };

firetray.Window.shutdown = function() {
  this.initialized = false;
};

firetray.Window.getVisibility = function(wid) {
  let hwnd = firetray.Win32.hexStrToHwnd(wid);
  let style;
  if (firetray.Handler.app.ABI == "x86_64-msvc") {
    style = user32.GetWindowLongPtrW(hwnd, user32.GWL_STYLE);
  } else {
    style = user32.GetWindowLongW(hwnd, user32.GWL_STYLE);
  }
  return ((style & user32.WS_VISIBLE) != 0); // user32.IsWindowVisible(hwnd);
};

// firetray.Window.{show,hide} useless as we don't need to restore position and size
firetray.Window.setVisibility = function(wid, visible) {
  log.debug("setVisibility="+visible);
  let hwnd = firetray.Win32.hexStrToHwnd(wid);
	if (user32.IsIconic(hwnd))
	{
		user32.ShowWindow(hwnd, user32.SW_RESTORE);
		visible = true;
	}
  let ret = user32.ShowWindow(hwnd, visible ? user32.SW_SHOW : user32.SW_HIDE);
  if (firetray.Utils.prefService.getBoolPref('show_activates'))
    if (visible) user32.SetForegroundWindow(hwnd);
  log.debug("  ShowWindow="+ret+" winLastError="+ctypes.winLastError);
  return visible;
};

firetray.Window.wndProc = function(hWnd, uMsg, wParam, lParam) { // filterWindow
  // log.debug("wndProc CALLED: hWnd="+hWnd+", uMsg=0x"+uMsg.toString(16)+", wParam="+wParam+", lParam="+lParam);
  let wid = firetray.Win32.hwndToHexStr(hWnd);

  if (uMsg === win32.WM_SYSCOMMAND) {
    log.debug("wndProc CALLED with WM_SYSCOMMAND wParam="+wParam);
    if (wParam === win32.SC_MINIMIZE) {
      log.debug("GOT ICONIFIED");
      if (firetray.Handler.onMinimize(wid)) {
        return 0;               // processed => preventDefault
      }
    }
  }

  let procPrev = firetray.Handler.wndProcsOrig.get(wid);
  return user32.CallWindowProcW(
    user32.WNDPROC(procPrev), hWnd, uMsg, wParam, lParam); // or DefWindowProcW
};

/*
 * For start_hidden, we get the best effect by intercepting
 * WM_WINDOWPOSCHANGING/SWP_SHOWWINDOW.
 * Here, we subclass only once either with a startup wndProc, if
 * start_hidden, or just our default wndProc. None of the following works:
 * - a WH_CALLWNDPROC hook doesn't catch SWP_SHOWWINDOW
 * - chaining WNDPROCs crashes the app (UserCallWinProcCheckWow or ffi_call)
 */
firetray.Window.wndProcStartup = function(hWnd, uMsg, wParam, lParam) {
  let wid = firetray.Win32.hwndToHexStr(hWnd);

  if (uMsg === win32.WM_WINDOWPOSCHANGING) {
    let posStruct = ctypes.cast(win32.LPARAM(lParam),
                                user32.WINDOWPOS.ptr).contents;

    let isShowing = ((posStruct.flags & user32.SWP_SHOWWINDOW) != 0);
    if (isShowing) {
      log.debug("wndProcStartup CALLED with WM_WINDOWPOSCHANGING/SWP_SHOWWINDOW");
      firetray.Window.startup.showCount += 1;

      if (firetray.Window.startup.showCount < 2) {  // hide
        log.debug("start_hidden");
        // Modifying posStruct is modifying lParam, which is passed onwards!
        if (firetray.Window.startup.showSpecial) {
          posStruct.flags &= user32.SWP_NOSIZE|user32.SWP_NOMOVE;
        }
        else {
          posStruct.flags &= ~user32.SWP_SHOWWINDOW;
        }
        let force = true;
        firetray.Handler.addPopupMenuWindowItemAndSeparatorMaybe(wid, force);
      }
      else {                    // restore
        firetray.Window.attachWndProc({
          wid: wid, hwnd: hWnd,
          jsProc: firetray.Window.wndProc,
          mapNew: firetray.Handler.wndProcs,
          mapBak: null
        });
        firetray.Handler.wndProcsStartup.remove(wid);

        if (firetray.Window.startup.showSpecial) {
          let placement = new user32.WINDOWPLACEMENT;
          let ret = user32.GetWindowPlacement(hWnd, placement.address());
          firetray.js.assert(ret, "GetWindowPlacement failed.");
          placement.showCmd = firetray.Window.startup.showSpecial;
          user32.SetWindowPlacement(hWnd, placement.address());
        }
      }
    }

  }

  let procPrev = firetray.Handler.wndProcsOrig.get(wid);
  return user32.CallWindowProcW(user32.WNDPROC(procPrev), hWnd, uMsg, wParam, lParam);
};

// procInfo = {wid, hwnd, jsProc, mapNew, mapBak}
var procDummy = null;
firetray.Window.attachWndProc = function(procInfo) {
  try {
    let wndProc = ctypes.cast(user32.WNDPROC(procInfo.jsProc), win32.LONG_PTR);
    log.debug("proc="+wndProc);
    procInfo.mapNew.insert(procInfo.wid, wndProc);
//    let procPrev = user32.SetWindowLongW(procInfo.hwnd, user32.GWLP_WNDPROC, wndProc);
    this.procDummy = wndProc;
    let procPrev;
    if (firetray.Handler.app.ABI == "x86_64-msvc") {
      procPrev = user32.SetWindowLongPtrW(procInfo.hwnd, user32.GWLP_WNDPROC, wndProc);
    } else {
      procPrev = user32.SetWindowLongW(procInfo.hwnd, user32.GWLP_WNDPROC, wndProc);
    }
    log.debug("procPrev="+procPrev+" winLastError="+ctypes.winLastError);
    /* we can't store WNDPROC callbacks (JS ctypes objects) with SetPropW(), as
     we need long-living refs. */
    if (procInfo.mapBak) procInfo.mapBak.insert(procInfo.wid, procPrev);

  } catch (x) {
    if (x.name === "RangeError") { // instanceof not working :-(
      let msg = x+"\n\nYou seem to have more than "+FIRETRAY_WINDOW_COUNT_MAX
                +" windows open. This breaks FireTray and most probably "
                +firetray.Handler.app.name+".";
      log.error(msg);
      Cu.reportError(msg);
    }else {
      log.error(x);
      Cu.reportError(x);
    }
  }
};

// procInfo = {wid, mapNew, mapBak}
firetray.Window.detachWndProc = function(procInfo) {
  let wid = procInfo.wid;
  let procBak = procInfo.mapBak.get(wid);
  let procNew = procInfo.mapNew.get(wid);
  let hwnd = firetray.Win32.hexStrToHwnd(wid);
  log.debug("hwnd="+hwnd);
  let procPrev;
  if (firetray.Handler.app.ABI == "x86_64-msvc") {
    procPrev = user32.SetWindowLongPtrW(hwnd, user32.GWLP_WNDPROC, procBak);
  } else {
    procPrev = user32.SetWindowLongW(hwnd, user32.GWLP_WNDPROC, procBak);
  }
  firetray.js.assert(firetray.js.strEquals(procPrev, procNew),
                     "Wrong WndProc replaced.");
  procInfo.mapNew.remove(wid);
  procInfo.mapBak.remove(wid);
};


///////////////////////// firetray.Handler overriding /////////////////////////

/** debug facility */
firetray.Handler.dumpWindows = function() {
  let dumpStr = ""+firetray.Handler.windowsCount;
  for (let wid in firetray.Handler.windows) {
    dumpStr += " "+wid;
  }
  log.info(dumpStr);
};

firetray.Handler.registerWindow = function(win) {
  log.debug("register window");

  let baseWin = firetray.Handler.getWindowInterface(win, "nsIBaseWindow");
  let wid = baseWin.nativeHandle;
  if (!wid) {
    log.error("nativeHandle undefined ?!");
    return false;
  }
  let hwnd = firetray.Win32.hexStrToHwnd(wid);
  log.debug("=== hwnd="+hwnd+" wid="+wid+" win.document.title: "+win.document.title);

  if (this.windows.hasOwnProperty(wid)) {
    let msg = "Window ("+wid+") already registered.";
    log.error(msg);
    Cu.reportError(msg);
    return false;
  }
  this.windows[wid] = {};
  this.windows[wid].chromeWin = win;
  this.windows[wid].baseWin = baseWin;
  Object.defineProperties(this.windows[wid], {
    "visible": { get: function(){return firetray.Window.getVisibility(wid);} }
  });
  log.debug("window "+wid+" registered");

  let proc, map;
  if (!firetray.Handler.appStarted &&
      firetray.Utils.prefService.getBoolPref('start_hidden')) {
    let startupInfo = new kernel32.STARTUPINFO;
    kernel32.GetStartupInfoW(startupInfo.address());
    let showSpecial = ([
      user32.SW_SHOWMINNOACTIVE, user32.SW_SHOWMINIMIZED,
      user32.SW_SHOWMAXIMIZED
    ].indexOf(startupInfo.wShowWindow) > -1) ? startupInfo.wShowWindow : 0;
    firetray.Window.startup = {showCount: 0, showSpecial: showSpecial};
    proc = firetray.Window.wndProcStartup; map = firetray.Handler.wndProcsStartup;
  } else {
    proc = firetray.Window.wndProc; map = firetray.Handler.wndProcs;
  }
  firetray.Window.attachWndProc({
    wid: wid, hwnd: hwnd,
    jsProc: proc,
    mapNew: map,
    mapBak: firetray.Handler.wndProcsOrig
  });

  firetray.Win32.acceptAllMessages(hwnd);

  log.debug("AFTER"); firetray.Handler.dumpWindows();
  return wid;
};

firetray.Handler.unregisterWindow = function(win) {
  log.debug("unregister window");

  let wid = firetray.Window.getRegisteredWinIdFromChromeWindow(win);
  if (!firetray.Handler.windows.hasOwnProperty(wid)) {
    log.error("can't unregister unknown window "+wid);
    return false;
  }

  let mapNew;
  try {
    firetray.Handler.wndProcsStartup.get(wid); // throws
    mapNew = firetray.Handler.wndProcsStartup;
    log.debug("Window never shown (unregistered but procStartup still in place).");
  } catch (x) {
    if (x.name === "RangeError") {
      mapNew = firetray.Handler.wndProcs;
    } else {
      log.error(x);
      Cu.reportError(x);
    }
  }
  firetray.Window.detachWndProc({
    wid: wid, mapNew: mapNew, mapBak: firetray.Handler.wndProcsOrig
  });

  if (!delete firetray.Handler.windows[wid])
    throw new DeleteError();

  firetray.Handler.dumpWindows();
  log.debug("window "+wid+" unregistered");
  return true;
};

firetray.Handler.showWindow = function(wid) {
  let r = firetray.Window.setVisibility(wid, true);
  if (r)
    firetray.Handler.removePopupMenuWindowItemAndSeparatorMaybe(wid);
  return r;
};
firetray.Handler.hideWindow = function(wid) {
  let r = firetray.Window.setVisibility(wid, false);
  if (!r)
    firetray.Handler.addPopupMenuWindowItemAndSeparatorMaybe(wid);
  return r;
};

firetray.Handler.windowGetAttention = function(wid) { // see nsWindow.cpp
  for (var first in this.windows) break;
  wid = wid || first;
  let hwnd = firetray.Win32.hexStrToHwnd(wid);
  let fgWnd = user32.GetForegroundWindow();
  log.debug(hwnd+" === "+fgWnd);
  if (firetray.js.strEquals(hwnd, fgWnd) ||
      !this.windows[wid].visible)
    return;

  let defaultCycleCount = new win32.DWORD;
  user32.SystemParametersInfoW(user32.SPI_GETFOREGROUNDFLASHCOUNT, 0,
                               defaultCycleCount.address(), 0);
  log.debug("defaultCycleCount="+defaultCycleCount);

  let flashInfo = new user32.FLASHWINFO;
  flashInfo.cbSize = user32.FLASHWINFO.size;
  flashInfo.hwnd = hwnd;
  flashInfo.dwFlags = user32.FLASHW_ALL;
  flashInfo.uCount = defaultCycleCount;
  flashInfo.dwTimeout = 0;
  user32.FlashWindowEx(flashInfo.address());
};
