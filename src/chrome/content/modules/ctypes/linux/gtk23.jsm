/*
 * This module contains definitions common to gtk2 and gtk3.
 * It is thus ONLY MEANT TO BE IMPORTED BY gtk.jsm modules !
 */
var EXPORTED_SYMBOLS = [ "gtk" ];

function gtk23_defines(lib) {
  /* FIXME: We can't easily share code btw. gtk2/gtk.jsm and gtk3/gtk.jsm
   because we'd need to import a gdk.jsm into gtk23.jsm... We can't import
   gdk23.jsm either because it's not supposed to provide 'gdk'. We can't even
   share say everything but gdk-related code because for ex. GtkWidget needs
   gdk, and is needed by *a lot* of other definitions. So we'll just keep it
   simple and have duplicate code in gtk2/gtk.jsm and gtk3/gtk.jsm for now.

   We'll probably drop support for gtk2 when all Moz apps are ported to
   gtk3. */
}
