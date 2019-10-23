/* -*- Mode: javascript; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

var EXPORTED_SYMBOLS = [
  "x11",
  "XATOMS", "XATOMS_ICCCM", "XATOMS_EWMH_GENERAL", "XATOMS_EWMH_WM_STATES",
  "XPROP_MAX_COUNT", "XPROP_BASE_TYPE", "XPROP_BASE_TYPE_LONG_PROPORTION"
];

const X11_LIBNAME = "X11";
const X11_ABIS    = [ 6 ];

const Cu = Components.utils;
const Cc = Components.classes;
const Ci = Components.interfaces;

Cu.import("resource://gre/modules/Services.jsm");
var { ctypes } = ChromeUtils.import("resource://gre/modules/ctypes.jsm");
Cu.import("resource://firetray/ctypes/ctypes-utils.jsm");

const XATOMS_ICCCM = [ "WM_DELETE_WINDOW", "WM_STATE", "WM_CHANGE_STATE" ];
const XATOMS_EWMH_GENERAL = [ "_NET_CLOSE_WINDOW", "_NET_WM_NAME",
  "_NET_WM_VISIBLE_NAME", "_NET_WM_ICON_NAME", "_NET_WM_VISIBLE_ICON_NAME",
  "_NET_WM_DESKTOP", "_NET_WM_WINDOW_TYPE", "_NET_WM_STATE",
  "_NET_WM_ALLOWED_ACTIONS", "_NET_WM_STRUT", "_NET_WM_STRUT_PARTIAL",
  "_NET_WM_ICON_GEOMETRY", "_NET_WM_ICON", "_NET_WM_PID",
  "_NET_WM_HANDLED_ICONS", "_NET_WM_USER_TIME", "_NET_FRAME_EXTENTS"
];
const XATOMS_EWMH_WM_STATES =  [
  "_NET_WM_STATE_MODAL", "_NET_WM_STATE_STICKY",
  "_NET_WM_STATE_MAXIMIZED_VERT", "_NET_WM_STATE_MAXIMIZED_HORZ",
  "_NET_WM_STATE_SHADED", "_NET_WM_STATE_SKIP_TASKBAR",
  "_NET_WM_STATE_SKIP_PAGER", "_NET_WM_STATE_HIDDEN",
  "_NET_WM_STATE_FULLSCREEN", "_NET_WM_STATE_ABOVE", "_NET_WM_STATE_BELOW",
  "_NET_WM_STATE_DEMANDS_ATTENTION"
];
const XATOMS_EWMH_ROOT = [ "_NET_ACTIVE_WINDOW" ]
const XATOMS = XATOMS_ICCCM
  .concat(XATOMS_EWMH_WM_STATES)
  .concat(XATOMS_EWMH_GENERAL)
  .concat(XATOMS_EWMH_ROOT)
  .concat(["CARDINAL"]);


function x11_defines(lib) {
  /* fundamental types need to be guessed :-( */
  // http://mxr.mozilla.org/mozilla-central/source/configure.in
  if (/^(Alpha|hppa|ia64|ppc64|s390|x86_64)-/.test(Services.appinfo.XPCOMABI)) {
    this.CARD32 = ctypes.unsigned_int;
    this.Atom = ctypes.unsigned_long;
    this.Window = ctypes.unsigned_long;
    this.Time = ctypes.unsigned_long;
    this.XID = ctypes.unsigned_long;
  } else {
    this.CARD32 = ctypes.unsigned_long;
    this.Atom = this.CARD32;
    this.Window = this.CARD32;
    this.Time =  this.CARD32;
    this.XID =  this.CARD32;
  }

  // X.h
  this.Success          = 0;
  this.None             = 0;
  this.AnyPropertyType  = 0;
  this.BadValue         = 2;
  this.BadWindow        = 3;
  this.BadAtom          = 5;
  this.BadMatch         = 8;
  this.BadAlloc         = 11;
  this.PropertyNewValue = 0;
  this.PropertyDelete   = 1;
  this.PropModeReplace  = 0;
  this.PropModePrepend  = 1;
  this.PropModeAppend   = 2;
  // Event names
  this.KeyPress         = 2;
  this.KeyRelease       = 3;
  this.ButtonPress      = 4;
  this.ButtonRelease    = 5;
  this.MotionNotify     = 6;
  this.EnterNotify      = 7;
  this.LeaveNotify      = 8;
  this.FocusIn          = 9;
  this.FocusOut         = 10;
  this.KeymapNotify     = 11;
  this.Expose           = 12;
  this.GraphicsExpose   = 13;
  this.NoExpose         = 14;
  this.VisibilityNotify = 15;
  this.CreateNotify     = 16;
  this.DestroyNotify    = 17;
  this.UnmapNotify      = 18;
  this.MapNotify        = 19;
  this.MapRequest       = 20;
  this.ReparentNotify   = 21;
  this.ConfigureNotify  = 22;
  this.ConfigureRequest = 23;
  this.GravityNotify    = 24;
  this.ResizeRequest    = 25;
  this.CirculateNotify  = 26;
  this.CirculateRequest = 27;
  this.PropertyNotify   = 28;
  this.SelectionClear   = 29;
  this.SelectionRequest = 30;
  this.SelectionNotify  = 31;
  this.ColormapNotify   = 32;
  this.ClientMessage    = 33;
  this.MappingNotify    = 34;
  this.GenericEvent     = 35;
  this.LASTEvent        = 36; /* must be bigger than any event # */
  // Xutils.h: definitions for initial window state
  this.WithdrawnState = 0;      /* for windows that are not mapped */
  this.NormalState    = 1;      /* most applications want to start this way */
  this.IconicState    = 3;      /* application wants to start as an icon */
  // Xatom
  this.XA_ATOM     = 4;
  this.XA_CARDINAL = 6;
  // Input Event Masks
  this.VisibilityChangeMask     = 1<<16
  this.StructureNotifyMask      = 1<<17
  this.SubstructureNotifyMask   = 1<<19;
  this.SubstructureRedirectMask = 1<<20;
  this.FocusChangeMask          = 1<<21
  this.PropertyChangeMask       = 1<<22

  this.Bool = ctypes.int;
  this.Status = ctypes.int;
  this.Pixmap = this.XID;
  this.Cursor = this.XID;
  this.Colormap = this.XID;
  this.GContext = this.XID;
  this.KeySym = this.XID;
  this.Visual = ctypes.StructType("Visual");
  this.Screen = ctypes.StructType("Screen");
  this.Display = ctypes.StructType("Display");
  // union not supported by js-ctypes
  // https://bugzilla.mozilla.org/show_bug.cgi?id=535378 "You can always
  // typecast pointers, at least as long as you know which type is the biggest"
  this.XEvent = ctypes.void_t;  // union
  this.XAnyEvent = ctypes.StructType("XAnyEvent", [
    { "type": ctypes.int },
    { "serial": ctypes.unsigned_long },
    { "send_event": this.Bool },
    { "display": this.Display.ptr },
    { "window": this.Window }
  ]);
  this.XClientMessageEvent = ctypes.StructType("XClientMessageEvent", [
    { "type": ctypes.int },
    { "serial": ctypes.unsigned_long },
    { "send_event": this.Bool },
    { "display": this.Display.ptr },
    { "window": this.Window },
    { "message_type": this.Atom },
    { "format": ctypes.int },
    { "data": ctypes.long.array(5) } // actually a union char b[20]; short s[10]; long l[5];
  ]);
  this.XPropertyEvent = ctypes.StructType("XPropertyEvent", [
    { "type": ctypes.int },
    { "serial": ctypes.unsigned_long },
    { "send_event": this.Bool },
    { "display": this.Display.ptr },
    { "window": this.Window },
    { "atom": this.Atom },
    { "time": this.Time },
    { "state": ctypes.int }     /* NewValue or Deleted */
  ]);

  this.XWindowAttributes = ctypes.StructType("XWindowAttributes", [
    { "x": ctypes.int },
    { "y": ctypes.int },                        /* location of window */
    { "width": ctypes.int },
    { "height": ctypes.int },                   /* width and height of window */
    { "border_width": ctypes.int },             /* border width of window */
    { "depth": ctypes.int },                    /* depth of window */
    { "visual": this.Visual.ptr },              /* the associated visual structure */
    { "root": this.Window },                    /* root of screen containing window */
    { "class": ctypes.int },                    /* InputOutput, InputOnly*/
    { "bit_gravity": ctypes.int },              /* one of bit gravity values */
    { "win_gravity": ctypes.int },              /* one of the window gravity values */
    { "backing_store": ctypes.int },            /* NotUseful, WhenMapped, Always */
    { "backing_planes": ctypes.unsigned_long }, /* planes to be preserved if possible */
    { "backing_pixel": ctypes.unsigned_long },  /* value to be used when restoring planes */
    { "save_under": this.Bool },                /* boolean, should bits under be saved? */
    { "colormap": this.Colormap },              /* color map to be associated with window */
    { "map_installed": this.Bool },             /* boolean, is color map currently installed*/
    { "map_state": ctypes.int },                /* IsUnmapped, IsUnviewable, IsViewable */
    { "all_event_masks": ctypes.long },         /* set of events all people have interest in*/
    { "your_event_mask": ctypes.long },         /* my event mask */
    { "do_not_propagate_mask": ctypes.long },   /* set of events that should not propagate */
    { "override_redirect": this.Bool },         /* boolean value for override-redirect */
    { "screen": this.Screen.ptr }               /* back pointer to correct screen */
  ]);

  this.XSetWindowAttributes = ctypes.StructType("XSetWindowAttributes", [
    { "background_pixmap": this.Pixmap },         /* background or None or ParentRelative */
    { "background_pixel": ctypes.unsigned_long },	/* background pixel */
    { "border_pixmap": this.Pixmap },             /* border of the window */
    { "border_pixel": ctypes.unsigned_long },     /* border pixel value */
    { "bit_gravity": ctypes.int },                /* one of bit gravity values */
    { "win_gravity": ctypes.int },                /* one of the window gravity values */
    { "backing_store": ctypes.int },              /* NotUseful, WhenMapped, Always */
    { "backing_planes": ctypes.unsigned_long },   /* planes to be preseved if possible */
    { "backing_pixel": ctypes.unsigned_long },    /* value to use in restoring planes */
    { "save_under": this.Bool },                  /* should bits under be saved? (popups) */
    { "event_mask": ctypes.long },                /* set of events that should be saved */
    { "do_not_propagate_mask": ctypes.long },     /* set of events that should not propagate */
    { "override_redirect": this.Bool },           /* boolean value for override-redirect */
    { "colormap": this.Colormap },                /* color map to be associated with window */
    { "cursor": this.Cursor }                     /* cursor to be displayed (or None) */
  ]);

  lib.lazy_bind("XFree", ctypes.int, ctypes.void_t.ptr);
  lib.lazy_bind("XInternAtom", this.Atom, this.Display.ptr, ctypes.char.ptr, this.Bool); // only_if_exsits
  lib.lazy_bind("XGetWindowProperty", ctypes.int, this.Display.ptr, this.Window, this.Atom, ctypes.long, ctypes.long, this.Bool, this.Atom, this.Atom.ptr, ctypes.int.ptr, ctypes.unsigned_long.ptr, ctypes.unsigned_long.ptr, ctypes.unsigned_char.ptr.ptr);
  lib.lazy_bind("XChangeProperty", ctypes.int, this.Display.ptr, this.Window, this.Atom, this.Atom, ctypes.int, ctypes.int, ctypes.unsigned_char.ptr, ctypes.int);
  lib.lazy_bind("XDefaultRootWindow", this.Window, this.Display.ptr);
  lib.lazy_bind("XSendEvent", this.Status, this.Display.ptr, this.Window, this.Bool, ctypes.long, this.XEvent.ptr);
  lib.lazy_bind("XRaiseWindow", ctypes.int, this.Display.ptr, this.Window);
  lib.lazy_bind("XGetWindowAttributes", this.Status, this.Display.ptr, this.Window, this.XWindowAttributes.ptr);
  lib.lazy_bind("XChangeWindowAttributes", ctypes.int, this.Display.ptr, this.Window, ctypes.unsigned_long, this.XSetWindowAttributes.ptr);
  lib.lazy_bind("XGetSelectionOwner", this.Window, this.Display.ptr, this.Atom);
  lib.lazy_bind("XGetAtomName", ctypes.char.ptr, this.Display.ptr, this.Atom);
  lib.lazy_bind("XOpenDisplay", this.Display.ptr, ctypes.char.ptr);
  lib.lazy_bind("XCloseDisplay", ctypes.int, this.Display.ptr);
}

new ctypes_library(X11_LIBNAME, X11_ABIS, x11_defines, this);


/* Xorg 1.10.4
#if defined (_LP64) || \
    defined(__alpha) || defined(__alpha__) || \
    defined(__ia64__) || defined(ia64) || \
    defined(__sparc64__) || \
    defined(__s390x__) || \
    (defined(__hppa__) && defined(__LP64__)) || \
    defined(__amd64__) || defined(amd64) || \
    defined(__powerpc64__) || \
    (defined(sgi) && (_MIPS_SZLONG == 64))
#define LONG64
#endif

# ifdef LONG64
typedef unsigned long CARD64;
typedef unsigned int CARD32;
# else
typedef unsigned long CARD32;
# endif

#  ifndef _XSERVER64
typedef unsigned long Atom;
#  else
typedef CARD32 Atom;
#  endif
*/
