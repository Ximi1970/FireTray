deps = gdk-2.0 gdk-pixbuf-2.0 atk
platform = $(shell uname -m)

CC = gcc
GCCVERSION = $(shell gcc -dumpversion | cut -f1 -d.)
CFLAGS += -O3 -fPIC -g -mtune=generic $(shell pkg-config --cflags $(deps))
LDFLAGS += -shared -rdynamic
#-Wl,--version-script -Wl,export-versionscript
#-Wl,-soname,libmystuff.so.1 -o libgnome.so.1.0.1
LIBS += $(shell pkg-config --libs $(deps))

libs = firetray_$(platform)-gcc$(GCCVERSION).so

all: $(libs)
	@echo
	@echo add this line to chrome.manifest:
	@echo "resource	firetray-lib			lib/linux/$(libs)	abi=Linux_x86_64-gcc3"
	@echo
	@echo and use
	@echo 'var { libfiretray } = ChromeUtils.import("resource://firetray/ctypes/libfiretray.jsm");'
	@echo 'firetray.Handler.subscribeLibsForClosing([libfiretray]);'
	@echo

$(libs): firetray.o
	$(CC) $(CFLAGS) $(LDFLAGS) $< $(LIBS) -o $@

%.o: %.c
	$(CC) $(CFLAGS) -c -o $@ $<

strip: $(libs)
	strip $<

clean:
	rm -rf $(libs) *.o

cp:
	cp $(libs) ../../lib/

install: clean all strip cp

.PHONY: all clean strip cp install
