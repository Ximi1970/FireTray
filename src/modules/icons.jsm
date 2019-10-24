/* -*- Mode: js2; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

this.EXPORTED_SYMBOLS = ['EMBEDDED_ICON_FILES'];

const {classes: Cc, interfaces: Ci, results: Cr, utils: Cu} = Components;

var { BLANK_ICON_BMP } = ChromeUtils.import("resource://firetray/icons/blank-icon.bmp.jsm");
var { BLANK_ICON_ICO } = ChromeUtils.import("resource://firetray/icons/blank-icon.ico.jsm");
var { MAIL_UNREAD_BMP } = ChromeUtils.import("resource://firetray/icons/mail-unread.bmp.jsm");
var { MAIL_UNREAD_ICO } = ChromeUtils.import("resource://firetray/icons/mail-unread.ico.jsm");
var { GTK_PREFERENCES_BMP } = ChromeUtils.import("resource://firetray/icons/gtk-preferences.bmp.jsm");
var { APPLICATION_EXIT_BMP } = ChromeUtils.import("resource://firetray/icons/application-exit.bmp.jsm");
var { DOCUMENT_NEW_BMP } = ChromeUtils.import("resource://firetray/icons/document-new.bmp.jsm");
var { GTK_EDIT_BMP } = ChromeUtils.import("resource://firetray/icons/gtk-edit.bmp.jsm");
var { GTK_APPLY_BMP } = ChromeUtils.import("resource://firetray/icons/gtk-apply.bmp.jsm");

const EMBEDDED_ICON_FILES = {
  'blank-icon-bmp': { use: 'tray', type: 'bmp', bin: BLANK_ICON_BMP },
  'mail-unread-bmp': { use: 'tray', type: 'bmp', bin: MAIL_UNREAD_BMP },
  'blank-icon': { use: 'tray', type: 'ico', bin: BLANK_ICON_ICO },
  'mail-unread': { use: 'tray', type: 'ico', bin: MAIL_UNREAD_ICO },
  'prefs': { use: 'menu', type: 'bmp', bin: GTK_PREFERENCES_BMP },
  'quit': { use: 'menu', type: 'bmp', bin: APPLICATION_EXIT_BMP },
  'new-wnd': { use: 'menu', type: 'bmp', bin: DOCUMENT_NEW_BMP },
  'new-msg': { use: 'menu', type: 'bmp', bin: GTK_EDIT_BMP },
  'reset': { use: 'menu', type: 'bmp', bin: GTK_APPLY_BMP },
};
