var EXPORTED_SYMBOLS = [ "gdi32" ];

const GDI32_LIBNAME = "gdi32";
const GDI32_ABIS    = [ "dll" ];

const Cu = Components.utils;

var { ctypes } = ChromeUtils.import("resource://gre/modules/ctypes.jsm");
var { ctypes_library, is64bit, WinCbABI } = ChromeUtils.import("chrome://firetray/content/modules/ctypes/ctypes-utils.jsm");
var { win32 } = ChromeUtils.import("chrome://firetray/content/modules/ctypes/winnt/win32.jsm");

function gdi32_defines(lib) {

  this.BITMAP = ctypes.StructType("BITMAP", [
    { "bmType": win32.LONG },
    { "bmWidth": win32.LONG },
    { "bmHeight": win32.LONG },
    { "bmWidthBytes": win32.LONG },
    { "bmPlanes": win32.WORD },
    { "bmBitsPixel": win32.WORD },
    { "bmBits": win32.LPVOID }
  ]);
  this.PBITMAP = this.BITMAP.ptr;

  lib.lazy_bind("CreateCompatibleDC", win32.HDC, win32.HDC);
  lib.lazy_bind("DeleteDC", win32.BOOL, win32.HDC);
  lib.lazy_bind("BitBlt", win32.BOOL, win32.HDC, ctypes.int, ctypes.int, ctypes.int, ctypes.int, win32.HDC, ctypes.int, ctypes.int, win32.DWORD);
  this.SRCCOPY        = win32.DWORD(0x00CC0020); /* dest = source                   */
  this.SRCPAINT       = win32.DWORD(0x00EE0086); /* dest = source OR dest           */
  this.SRCAND         = win32.DWORD(0x008800C6); /* dest = source AND dest          */
  this.SRCINVERT      = win32.DWORD(0x00660046); /* dest = source XOR dest          */
  this.SRCERASE       = win32.DWORD(0x00440328); /* dest = source AND (NOT dest )   */
  this.NOTSRCCOPY     = win32.DWORD(0x00330008); /* dest = (NOT source)             */
  this.NOTSRCERASE    = win32.DWORD(0x001100A6); /* dest = (NOT src) AND (NOT dest) */
  this.MERGECOPY      = win32.DWORD(0x00C000CA); /* dest = (source AND pattern)     */
  this.MERGEPAINT     = win32.DWORD(0x00BB0226); /* dest = (NOT source) OR dest     */
  this.PATCOPY        = win32.DWORD(0x00F00021); /* dest = pattern                  */
  this.PATPAINT       = win32.DWORD(0x00FB0A09); /* dest = DPSnoo                   */
  this.PATINVERT      = win32.DWORD(0x005A0049); /* dest = pattern XOR dest         */
  this.DSTINVERT      = win32.DWORD(0x00550009); /* dest = (NOT dest)               */
  this.BLACKNESS      = win32.DWORD(0x00000042); /* dest = BLACK                    */
  this.WHITENESS      = win32.DWORD(0x00FF0062); /* dest = WHITE                    */
  this.NOMIRRORBITMAP = win32.DWORD(0x80000000); /* Do not Mirror the bitmap in this call */
  this.CAPTUREBLT     = win32.DWORD(0x40000000); /* Include layered windows */
  lib.lazy_bind("CreateCompatibleBitmap", win32.HBITMAP, win32.HDC, ctypes.int, ctypes.int);
  lib.lazy_bind("CreateBitmap", win32.HBITMAP, ctypes.int, ctypes.int, win32.UINT, win32.UINT, ctypes.voidptr_t);
  lib.lazy_bind("CreateBitmapIndirect", win32.HBITMAP, win32.BITMAP.ptr);
  lib.lazy_bind("GetObjectW", ctypes.int, win32.HGDIOBJ, ctypes.int, win32.LPVOID);
  lib.lazy_bind("GetCurrentObject", win32.HGDIOBJ, win32.HDC, win32.UINT);
  this.OBJ_PEN         = 1;
  this.OBJ_BRUSH       = 2;
  this.OBJ_DC          = 3;
  this.OBJ_METADC      = 4;
  this.OBJ_PAL         = 5;
  this.OBJ_FONT        = 6;
  this.OBJ_BITMAP      = 7;
  this.OBJ_REGION      = 8;
  this.OBJ_METAFILE    = 9;
  this.OBJ_MEMDC       = 10;
  this.OBJ_EXTPEN      = 11;
  this.OBJ_ENHMETADC   = 12;
  this.OBJ_ENHMETAFILE = 13;
  this.OBJ_COLORSPACE  = 14;
  lib.lazy_bind("SelectObject", win32.HGDIOBJ, win32.HDC, win32.HGDIOBJ);
  lib.lazy_bind("DeleteObject", win32.BOOL, win32.HGDIOBJ);
  lib.lazy_bind("PatBlt", win32.BOOL, win32.HDC, ctypes.int, ctypes.int, ctypes.int, ctypes.int, win32.DWORD);
  this.BLACKNESS = win32.DWORD(0x00000042); /* dest = BLACK */
  this.WHITENESS = win32.DWORD(0x00FF0062); /* dest = WHITE */
  lib.lazy_bind("CreateFontW", win32.HFONT, ctypes.int, ctypes.int, ctypes.int, ctypes.int, ctypes.int, win32.DWORD, win32.DWORD, win32.DWORD, win32.DWORD, win32.DWORD, win32.DWORD, win32.DWORD, win32.DWORD, win32.LPCWSTR);
  this.FW_DONTCARE   = 0;
  this.FW_THIN       = 100;
  this.FW_EXTRALIGHT = 200;
  this.FW_LIGHT      = 300;
  this.FW_NORMAL     = 400;
  this.FW_MEDIUM     = 500;
  this.FW_SEMIBOLD   = 600;
  this.FW_BOLD       = 700;
  this.FW_EXTRABOLD  = 800;
  this.FW_HEAVY      = 900;
  this.FF_DONTCARE   = (0<<4);  /* Don't care or don't know. */
  this.FF_ROMAN      = (1<<4);  /* Variable stroke width, serifed. Times Roman, Century Schoolbook, etc. */
  this.FF_SWISS      = (2<<4);  /* Variable stroke width, sans-serifed. Helvetica, Swiss, etc. */
  this.FF_MODERN     = (3<<4);  /* Constant stroke width, serifed or sans-serifed. Pica, Elite, Courier, etc. */
  this.FF_SCRIPT     = (4<<4);  /* Cursive, etc. */
  this.FF_DECORATIVE = (5<<4);  /* Old English, etc. */
  this.DEFAULT_PITCH  = 0;
  this.FIXED_PITCH    = 1;
  this.VARIABLE_PITCH = 2;
  this.MONO_FONT      = 8;
  this.ANSI_CHARSET        = 0;
  this.DEFAULT_CHARSET     = 1;
  this.SYMBOL_CHARSET      = 2;
  this.SHIFTJIS_CHARSET    = 128;
  this.HANGEUL_CHARSET     = 129;
  this.HANGUL_CHARSET      = 129;
  this.GB2312_CHARSET      = 134;
  this.CHINESEBIG5_CHARSET = 136;
  this.OEM_CHARSET         = 255;
  this.JOHAB_CHARSET       = 130;
  this.HEBREW_CHARSET      = 177;
  this.ARABIC_CHARSET      = 178;
  this.GREEK_CHARSET       = 161;
  this.TURKISH_CHARSET     = 162;
  this.VIETNAMESE_CHARSET  = 163;
  this.THAI_CHARSET        = 222;
  this.EASTEUROPE_CHARSET  = 238;
  this.RUSSIAN_CHARSET     = 204;
  this.DEFAULT_QUALITY           = 0;
  this.DRAFT_QUALITY             = 1;
  this.PROOF_QUALITY             = 2;
  this.NONANTIALIASED_QUALITY    = 3;
  this.ANTIALIASED_QUALITY       = 4;
  this.CLEARTYPE_QUALITY         = 5;
  this.CLEARTYPE_NATURAL_QUALITY = 6;
  this.OUT_DEFAULT_PRECIS        = 0;
  this.OUT_STRING_PRECIS         = 1;
  this.OUT_CHARACTER_PRECIS      = 2;
  this.OUT_STROKE_PRECIS         = 3;
  this.OUT_TT_PRECIS             = 4;
  this.OUT_DEVICE_PRECIS         = 5;
  this.OUT_RASTER_PRECIS         = 6;
  this.OUT_TT_ONLY_PRECIS        = 7;
  this.OUT_OUTLINE_PRECIS        = 8;
  this.OUT_SCREEN_OUTLINE_PRECIS = 9;
  this.OUT_PS_ONLY_PRECIS        = 10;

  lib.lazy_bind("GetTextFaceW", ctypes.int, win32.HDC, ctypes.int, win32.LPTSTR);
  lib.lazy_bind("SetTextColor", win32.COLORREF, win32.HDC, win32.COLORREF);
  lib.lazy_bind("SetBkMode", ctypes.int, win32.HDC, ctypes.int);
  this.TRANSPARENT = 1;
  this.OPAQUE      = 2;
  this.BKMODE_LAST = 2;

  lib.lazy_bind("TextOutW", win32.BOOL, win32.HDC, ctypes.int, ctypes.int, win32.LPCTSTR, ctypes.int);

  this.SIZE = ctypes.StructType("SIZE", [
    { "cx": win32.LONG },
    { "cy": win32.LONG }
  ]);
  this.LPSIZE = this.SIZE.ptr;
  lib.lazy_bind("GetTextExtentPoint32W", win32.BOOL, win32.HDC, win32.LPCTSTR, ctypes.int, this.LPSIZE);

  lib.lazy_bind("GetTextAlign", win32.UINT, win32.HDC);
  lib.lazy_bind("SetTextAlign", win32.UINT, win32.HDC, win32.UINT);
  this.TA_LEFT       = 0;
  this.TA_RIGHT      = 2;
  this.TA_CENTER     = 6;
  this.TA_TOP        = 0;
  this.TA_BOTTOM     = 8;
  this.TA_BASELINE   = 24;
  this.TA_RTLREADING = 256;
  this.TA_MASK       =(this.TA_BASELINE+this.TA_CENTER+this.TA_UPDATECP+this.TA_RTLREADING);

  this.BITMAPINFOHEADER = ctypes.StructType("BITMAPINFOHEADER", [
    { "biSize": win32.DWORD },
    { "biWidth": win32.LONG },
    { "biHeight": win32.LONG },
    { "biPlanes": win32.WORD },
    { "biBitCount": win32.WORD },
    { "biCompression": win32.DWORD },
    { "biSizeImage": win32.DWORD },
    { "biXPelsPerMeter": win32.LONG },
    { "biYPelsPerMeter": win32.LONG },
    { "biClrUsed": win32.DWORD },
    { "biClrImportant": win32.DWORD }
  ]);
  this.PBITMAPINFOHEADER = this.BITMAPINFOHEADER.ptr;
  this.RGBQUAD = ctypes.StructType("RGBQUAD", [
    { "rgbBlue": win32.BYTE },
    { "rgbGreen": win32.BYTE },
    { "rgbRed": win32.BYTE },
    { "rgbReserved": win32.BYTE }
  ]);
  this.BITMAPINFO = ctypes.StructType("BITMAPINFO", [
    { "bmiHeader": this.BITMAPINFOHEADER },
    { "bmiColors": this.RGBQUAD.array(1) }
  ]);
  this.PBITMAPINFO = this.BITMAPINFO.ptr;
  lib.lazy_bind("SetDIBits", ctypes.int, win32.HDC, win32.HBITMAP, win32.UINT, win32.UINT, ctypes.voidptr_t, this.BITMAPINFO.ptr, win32.UINT);

  lib.lazy_bind("GetPixel", win32.COLORREF, win32.HDC, ctypes.int, ctypes.int);
  lib.lazy_bind("SetPixel", win32.COLORREF, win32.HDC, ctypes.int, ctypes.int, win32.COLORREF);

}

new ctypes_library(GDI32_LIBNAME, GDI32_ABIS, gdi32_defines, this);
