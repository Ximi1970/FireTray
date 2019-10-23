/*
 * This module contains definitions common to gtk2 and gtk3.
 * It is thus ONLY MEANT TO BE IMPORTED BY gtk.jsm modules !
 */
var EXPORTED_SYMBOLS = [ "gdk23_defines" ];

const Cu = Components.utils;
const Cc = Components.classes;
const Ci = Components.interfaces;

var { ctypes } = ChromeUtils.import("resource://gre/modules/ctypes.jsm");
Cu.import("resource://firetray/ctypes/linux/cairo.jsm");
Cu.import("resource://firetray/ctypes/linux/glib.jsm");
Cu.import("resource://firetray/ctypes/linux/gobject.jsm");
Cu.import("resource://firetray/ctypes/linux/x11.jsm");

function gdk23_defines(lib) {

  this.GdkInterpType = ctypes.int; // enum
  this.GDK_INTERP_NEAREST  = 0;
  this.GDK_INTERP_TILES    = 1;
  this.GDK_INTERP_BILINEAR = 2;
  this.GDK_INTERP_HYPE     = 3;
  this.GdkFilterReturn = ctypes.int; // enum
  this.GDK_FILTER_CONTINUE  = 0;
  this.GDK_FILTER_TRANSLATE = 1;
  this.GDK_FILTER_REMOVE    = 2;
  this.GdkWindowState = ctypes.int; // enum
  this.GDK_WINDOW_STATE_WITHDRAWN  = 1 << 0,
  this.GDK_WINDOW_STATE_ICONIFIED  = 1 << 1,
  this.GDK_WINDOW_STATE_MAXIMIZED  = 1 << 2,
  this.GDK_WINDOW_STATE_STICKY     = 1 << 3,
  this.GDK_WINDOW_STATE_FULLSCREEN = 1 << 4,
  this.GDK_WINDOW_STATE_ABOVE      = 1 << 5,
  this.GDK_WINDOW_STATE_BELOW      = 1 << 6;
  this.GdkEventType = ctypes.int; // enum
  this.GDK_NOTHING           = -1;
  this.GDK_DELETE            = 0;
  this.GDK_DESTROY           = 1;
  this.GDK_EXPOSE            = 2;
  this.GDK_MOTION_NOTIFY     = 3;
  this.GDK_BUTTON_PRESS      = 4;
  this.GDK_2BUTTON_PRESS     = 5;
  this.GDK_3BUTTON_PRESS     = 6;
  this.GDK_BUTTON_RELEASE    = 7;
  this.GDK_KEY_PRESS         = 8;
  this.GDK_KEY_RELEASE       = 9;
  this.GDK_ENTER_NOTIFY      = 10;
  this.GDK_LEAVE_NOTIFY      = 11;
  this.GDK_FOCUS_CHANGE      = 12;
  this.GDK_CONFIGURE         = 13;
  this.GDK_MAP               = 14;
  this.GDK_UNMAP             = 15;
  this.GDK_PROPERTY_NOTIFY   = 16;
  this.GDK_SELECTION_CLEAR   = 17;
  this.GDK_SELECTION_REQUEST = 18;
  this.GDK_SELECTION_NOTIFY  = 19;
  this.GDK_PROXIMITY_IN      = 20;
  this.GDK_PROXIMITY_OUT     = 21;
  this.GDK_DRAG_ENTER        = 22;
  this.GDK_DRAG_LEAVE        = 23;
  this.GDK_DRAG_MOTION       = 24;
  this.GDK_DRAG_STATUS       = 25;
  this.GDK_DROP_START        = 26;
  this.GDK_DROP_FINISHED     = 27;
  this.GDK_CLIENT_EVENT      = 28;
  this.GDK_VISIBILITY_NOTIFY = 29;
  this.GDK_NO_EXPOSE         = 30;
  this.GDK_SCROLL            = 31;
  this.GDK_WINDOW_STATE      = 32;
  this.GDK_SETTING           = 33;
  this.GDK_OWNER_CHANGE      = 34;
  this.GDK_GRAB_BROKEN       = 35;
  this.GDK_DAMAGE            = 36;
  this.GDK_EVENT_LAST = 37;      /* helper variable for decls */
  this.GdkPropMode = ctypes.int; // enum
  this.GDK_PROP_MODE_REPLACE = 0;
  this.GDK_PROP_MODE_PREPEN  = 1;
  this.GDK_PROP_MODE_APPEND  = 2;
  this.GdkScrollDirection = ctypes.int; // enum
  this.GDK_SCROLL_UP    = 0;
  this.GDK_SCROLL_DOWN  = 1;
  this.GDK_SCROLL_LEFT  = 2;
  this.GDK_SCROLL_RIGHT = 3;
  this.GdkEventMask = ctypes.int; // enum
  this.GDK_EXPOSURE_MASK            = 1 << 1,
  this.GDK_POINTER_MOTION_MASK      = 1 << 2,
  this.GDK_POINTER_MOTION_HINT_MASK = 1 << 3,
  this.GDK_BUTTON_MOTION_MASK       = 1 << 4,
  this.GDK_BUTTON1_MOTION_MASK      = 1 << 5,
  this.GDK_BUTTON2_MOTION_MASK      = 1 << 6,
  this.GDK_BUTTON3_MOTION_MASK      = 1 << 7,
  this.GDK_BUTTON_PRESS_MASK        = 1 << 8,
  this.GDK_BUTTON_RELEASE_MASK      = 1 << 9,
  this.GDK_KEY_PRESS_MASK           = 1 << 10,
  this.GDK_KEY_RELEASE_MASK         = 1 << 11,
  this.GDK_ENTER_NOTIFY_MASK        = 1 << 12,
  this.GDK_LEAVE_NOTIFY_MASK        = 1 << 13,
  this.GDK_FOCUS_CHANGE_MASK        = 1 << 14,
  this.GDK_STRUCTURE_MASK           = 1 << 15,
  this.GDK_PROPERTY_CHANGE_MASK     = 1 << 16,
  this.GDK_VISIBILITY_NOTIFY_MASK   = 1 << 17,
  this.GDK_PROXIMITY_IN_MASK        = 1 << 18,
  this.GDK_PROXIMITY_OUT_MASK       = 1 << 19,
  this.GDK_SUBSTRUCTURE_MASK        = 1 << 20,
  this.GDK_SCROLL_MASK              = 1 << 21,
  this.GDK_ALL_EVENTS_MASK          = 0x3FFFFE
  this.GdkColorspace = ctypes.int;     // enum
  this.GDK_COLORSPACE_RGB = 0;

  this.GdkWindowClass = ctypes.int;     // enum
  this.GDK_INPUT_OUTPUT = 0;
  this.GDK_INPUT_ONLY   = 1;

  this.GdkWindow = ctypes.StructType("GdkWindow");
  this.GdkByteOrder = ctypes.int; // enum
  this.GdkVisualType = ctypes.int; // enum
  this.GdkVisual = ctypes.StructType("GdkVisual", [
    { "parent_instance": gobject.GObject },
    { "type": this.GdkVisualType },
    { "depth": gobject.gint },
    { "byte": this.GdkByteOrder },
    { "colormap": gobject.gint },
    { "bits": gobject.gint },
    { "red_mask": gobject.guint32 },
    { "red_shift": gobject.gint },
    { "red_prec": gobject.gint },
    { "green_mask": gobject.guint32 },
    { "green_shift": gobject.gint },
    { "green_prec": gobject.gint },
    { "blue_mask": gobject.guint32 },
    { "blue_shift": gobject.gint },
    { "blue_prec": gobject.gint }
  ]);
  this.GdkColor = ctypes.StructType("GdkColor", [
    { "pixel": gobject.guint32 },
    { "red": gobject.guint16 },
    { "green": gobject.guint16 },
    { "blue": gobject.guint16 }
  ]);
  this.GdkColormap = ctypes.StructType("GdkColormap", [
    { "size": gobject.gint },
    { "colors": this.GdkColor.ptr }
  ]);
  this.GdkWindowType = ctypes.StructType("GdkWindowType");
  this.GdkCursor = ctypes.StructType("GdkCursor");
  this.GdkWindowTypeHint = ctypes.StructType("GdkWindowTypeHint");
  this.GdkWindowClass = ctypes.StructType("GdkWindowClass");
  this.GdkPixbuf = ctypes.StructType("GdkPixbuf");
  this.GdkScreen = ctypes.StructType("GdkScreen");
  this.GdkGC = ctypes.StructType("GdkGC");
  this.GdkXEvent = ctypes.void_t; // will probably be cast to XEvent
  this.GdkEvent = ctypes.void_t;
  this.GdkDisplay = ctypes.StructType("GdkDisplay");
  this.GdkFilterFunc = ctypes.voidptr_t;
  this.GdkEventWindowState = ctypes.StructType("GdkEventWindowState", [
    { "type": this.GdkEventType },
    { "window": this.GdkWindow.ptr },
    { "send_event": gobject.gint8 },
    { "changed_mask": this.GdkWindowState },
    { "new_window_state": this.GdkWindowState },
  ]);
  this.GdkDevice = ctypes.StructType("GdkDevice");
  this.GdkEventScroll = ctypes.StructType("GdkEventScroll", [
    { "type": this.GdkEventType },
    { "window": this.GdkWindow.ptr },
    { "send_event": gobject.gint8 },
    { "time": gobject.guint32 },
    { "x": gobject.gdouble },
    { "y": gobject.gdouble },
    { "state": gobject.guint },
    { "direction": this.GdkScrollDirection },
    { "device": this.GdkDevice.ptr },
    { "x_root": gobject.gdouble },
    { "y_root": gobject.gdouble }
  ]);
  this.GdkAtom = ctypes.StructType("GdkAtom");
  this.GdkEventButton = ctypes.StructType("GdkEventButton", [
    { "type": this.GdkEventType },
    { "window": this.GdkWindow.ptr },
    { "send_event": gobject.gint8 },
    { "time": gobject.guint32 },
    { "x": gobject.gdouble },
    { "y": gobject.gdouble },
    { "axes": gobject.gdouble.ptr },
    { "state": gobject.guint },
    { "button": gobject.guint },
    { "device": this.GdkDevice.ptr },
    { "x_root": gobject.gdouble },
    { "y_root": gobject.gdouble }
  ]);
  this.GdkEventFocus = ctypes.StructType("GdkEventFocus", [
    { "type": this.GdkEventType },
    { "window": this.GdkWindow.ptr },
    { "send_event": gobject.gint8 },
    { "in": gobject.gint16 },
  ]);

  this.GdkFilterFunc_t = ctypes.FunctionType(
    ctypes.default_abi, this.GdkFilterReturn,
    [this.GdkXEvent.ptr, this.GdkEvent.ptr, gobject.gpointer]).ptr;

  this.GdkPixbufLoader = ctypes.StructType("GdkPixbufLoader");

  lib.lazy_bind("gdk_flush", ctypes.void_t);
  lib.lazy_bind("gdk_error_trap_push", ctypes.void_t);
  lib.lazy_bind("gdk_error_trap_pop", gobject.gint);

  lib.lazy_bind("gdk_window_destroy", ctypes.void_t, this.GdkWindow.ptr);
  lib.lazy_bind("gdk_x11_window_set_user_time", ctypes.void_t, this.GdkWindow.ptr, gobject.guint32);
  lib.lazy_bind("gdk_window_hide", ctypes.void_t, this.GdkWindow.ptr);
  lib.lazy_bind("gdk_window_show_unraised", ctypes.void_t, this.GdkWindow.ptr);
  lib.lazy_bind("gdk_screen_get_default", this.GdkScreen.ptr);
  lib.lazy_bind("gdk_screen_get_toplevel_windows", gobject.GList.ptr, this.GdkScreen.ptr);
  lib.lazy_bind("gdk_screen_get_number", gobject.gint, this.GdkScreen.ptr);
  lib.lazy_bind("gdk_screen_get_display", this.GdkDisplay.ptr, this.GdkScreen.ptr);
  lib.lazy_bind("gdk_x11_get_xatom_by_name_for_display", x11.Atom, this.GdkDisplay.ptr, gobject.gchar.ptr);
  lib.lazy_bind("gdk_pixbuf_new_from_file", this.GdkPixbuf.ptr, gobject.gchar.ptr, glib.GError.ptr.ptr);
  lib.lazy_bind("gdk_pixbuf_copy", this.GdkPixbuf.ptr, this.GdkPixbuf.ptr);
  lib.lazy_bind("gdk_pixbuf_composite", ctypes.void_t, this.GdkPixbuf.ptr, this.GdkPixbuf.ptr, ctypes.int, ctypes.int, ctypes.int, ctypes.int, ctypes.double, ctypes.double, ctypes.double, ctypes.double, ctypes.int, ctypes.int);
  lib.lazy_bind("gdk_pixbuf_get_has_alpha", gobject.gboolean, this.GdkPixbuf.ptr);
  lib.lazy_bind("gdk_pixbuf_add_alpha", this.GdkPixbuf.ptr, this.GdkPixbuf.ptr, gobject.gboolean, gobject.guchar, gobject.guchar, gobject.guchar);
  lib.lazy_bind("gdk_pixbuf_get_colorspace", this.GdkColorspace, this.GdkPixbuf.ptr);
  lib.lazy_bind("gdk_pixbuf_get_n_channels", ctypes.int, this.GdkPixbuf.ptr);
  lib.lazy_bind("gdk_pixbuf_get_has_alpha", gobject.gboolean, this.GdkPixbuf.ptr);
  lib.lazy_bind("gdk_pixbuf_get_bits_per_sample", ctypes.int, this.GdkPixbuf.ptr);
  lib.lazy_bind("gdk_pixbuf_get_pixels", gobject.guchar.ptr, this.GdkPixbuf.ptr);
  lib.lazy_bind("gdk_pixbuf_get_width", ctypes.int, this.GdkPixbuf.ptr);
  lib.lazy_bind("gdk_pixbuf_get_height", ctypes.int, this.GdkPixbuf.ptr);
  lib.lazy_bind("gdk_pixbuf_get_rowstride", ctypes.int, this.GdkPixbuf.ptr);
  lib.lazy_bind("gdk_pixbuf_get_byte_length", gobject.gsize, this.GdkPixbuf.ptr);
  lib.lazy_bind("gdk_pixbuf_copy", this.GdkPixbuf.ptr, this.GdkPixbuf.ptr);
  lib.lazy_bind("gdk_pixbuf_save", gobject.gboolean, this.GdkPixbuf.ptr, gobject.gchar.ptr, gobject.gchar.ptr, glib.GError.ptr.ptr, gobject.gchar.ptr);
  lib.lazy_bind("gdk_pixbuf_loader_new", this.GdkPixbufLoader.ptr);
  lib.lazy_bind("gdk_pixbuf_loader_write", gobject.gboolean, this.GdkPixbufLoader.ptr, gobject.guchar.ptr, gobject.gsize, glib.GError.ptr.ptr);
  lib.lazy_bind("gdk_pixbuf_loader_write_bytes", gobject.gboolean, this.GdkPixbufLoader.ptr, glib.GBytes.ptr, glib.GError.ptr.ptr);
  lib.lazy_bind("gdk_pixbuf_loader_get_pixbuf", this.GdkPixbuf.ptr, this.GdkPixbufLoader.ptr);
  lib.lazy_bind("gdk_pixbuf_loader_close", gobject.gboolean, this.GdkPixbufLoader.ptr, glib.GError.ptr.ptr);
  
  lib.lazy_bind("gdk_screen_get_system_visual", this.GdkVisual.ptr, this.GdkScreen.ptr);
  lib.lazy_bind("gdk_screen_get_system_colormap", this.GdkColormap.ptr, this.GdkScreen.ptr);
  lib.lazy_bind("gdk_colormap_get_visual", this.GdkVisual.ptr, this.GdkColormap.ptr);
  lib.lazy_bind("gdk_color_parse", gobject.gboolean, gobject.gchar.ptr, this.GdkColor.ptr);
  lib.lazy_bind("gdk_colormap_alloc_color", gobject.gboolean, this.GdkColormap.ptr, this.GdkColor.ptr, gobject.gboolean, gobject.gboolean);

  lib.lazy_bind("gdk_cairo_set_source_color", ctypes.void_t, cairo.cairo_t.ptr, this.GdkColor.ptr);
  lib.lazy_bind("gdk_pixbuf_add_alpha", this.GdkPixbuf.ptr, this.GdkPixbuf.ptr, gobject.gboolean, gobject.guchar, gobject.guchar, gobject.guchar);
  lib.lazy_bind("gdk_pixbuf_composite", ctypes.void_t, this.GdkPixbuf.ptr, this.GdkPixbuf.ptr, ctypes.int, ctypes.int, ctypes.int, ctypes.int, ctypes.double, ctypes.double, ctypes.double, ctypes.double, this.GdkInterpType, ctypes.int);

  lib.lazy_bind("gdk_window_stick", ctypes.void_t, this.GdkWindow.ptr);
  lib.lazy_bind("gdk_window_iconify", ctypes.void_t, this.GdkWindow.ptr);
  lib.lazy_bind("gdk_window_deiconify", ctypes.void_t, this.GdkWindow.ptr);
  lib.lazy_bind("gdk_window_set_title", ctypes.void_t, this.GdkWindow.ptr, gobject.gchar.ptr);
  lib.lazy_bind("gdk_window_beep", ctypes.void_t, this.GdkWindow.ptr);
  lib.lazy_bind("gdk_window_get_width", ctypes.int, this.GdkWindow.ptr);

  lib.lazy_bind("gdk_window_get_events", this.GdkEventMask, this.GdkWindow.ptr);
  lib.lazy_bind("gdk_window_set_events", ctypes.void_t, this.GdkWindow.ptr, this.GdkEventMask);
  lib.lazy_bind("gdk_window_add_filter", ctypes.void_t, this.GdkWindow.ptr, this.GdkFilterFunc, gobject.gpointer);
  lib.lazy_bind("gdk_window_remove_filter", ctypes.void_t, this.GdkWindow.ptr, this.GdkFilterFunc, gobject.gpointer);
  lib.lazy_bind("gdk_display_get_default", this.GdkDisplay.ptr);
  lib.lazy_bind("gdk_x11_display_get_xdisplay", x11.Display.ptr, this.GdkDisplay.ptr);
  lib.lazy_bind("gdk_window_get_state", this.GdkWindowState, this.GdkWindow.ptr);
  lib.lazy_bind("gdk_window_get_position", ctypes.void_t, this.GdkWindow.ptr, gobject.gint.ptr, gobject.gint.ptr);
  // lib.lazy_bind("gdk_window_get_geometry", ctypes.void_t, this.GdkWindow.ptr, gobject.gint.ptr, gobject.gint.ptr, gobject.gint.ptr, gobject.gint.ptr, gobject.gint.ptr);
  lib.lazy_bind("gdk_window_move_resize", ctypes.void_t, this.GdkWindow.ptr, gobject.gint, gobject.gint, gobject.gint, gobject.gint);
  lib.lazy_bind("gdk_window_get_user_data", ctypes.void_t, this.GdkWindow.ptr, gobject.gpointer.ptr);
  lib.lazy_bind("gdk_atom_intern", this.GdkAtom, gobject.gchar.ptr, gobject.gboolean);
  lib.lazy_bind("gdk_property_change", ctypes.void_t, this.GdkWindow.ptr, this.GdkAtom, this.GdkAtom, gobject.gint, this.GdkPropMode, gobject.guchar.ptr, gobject.gint);
  lib.lazy_bind("gdk_window_get_toplevel", this.GdkWindow.ptr, this.GdkWindow.ptr);
  lib.lazy_bind("gdk_window_get_effective_toplevel", this.GdkWindow.ptr, this.GdkWindow.ptr);
  lib.lazy_bind("gdk_screen_get_active_window", this.GdkWindow.ptr, this.GdkScreen.ptr);

  lib.lazy_bind("gdk_display_get_n_screens", gobject.gint, this.GdkDisplay.ptr);
  lib.lazy_bind("gdk_display_get_screen", this.GdkScreen.ptr, this.GdkDisplay.ptr, gobject.gint);
}
