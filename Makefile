PROJECT=theoldreader

SRC=source
TARGET=build

SOURCES = $(shell find $(SRC) -print)

# Preserve builds
.SECONDARY: $(TARGET)/chrome/ $(TARGET)/firefox/

all: chrome firefox

firefox: $(TARGET)/$(PROJECT)-firefox.xpi

chrome: $(TARGET)/$(PROJECT)-chrome.zip

$(TARGET)/$(PROJECT)-%.zip: $(TARGET)/%
	@echo "\n*** Rebuilding $*.zip ***\n"
	cd $(TARGET)/$* && zip -qr ../$(PROJECT)-$*.zip *

$(TARGET)/$(PROJECT)-%.xpi: $(TARGET)/%
	@echo "\n*** Rebuilding $*.xpi ***\n"
	cd $(TARGET)/$* && zip -qr ../$(PROJECT)-$*.xpi *

$(TARGET)/chrome: $(SOURCES)
	@echo "\n*** Rebuilding chrome ***\n"
	mkdir -p $@
	rm -rf $(TARGET)/chrome/*
	cp -r $(SRC)/* $@
	mv $(TARGET)/chrome/manifest-chrome.json $(TARGET)/chrome/manifest.json
	rm -f $(TARGET)/chrome/manifest-*.json

$(TARGET)/firefox: $(SOURCES)
	@echo "\n*** Rebuilding firefox ***\n"
	mkdir -p $@
	rm -rf $(TARGET)/firefox/*
	cp -r $(SRC)/* $@
	mv $(TARGET)/firefox/manifest-firefox.json $(TARGET)/firefox/manifest.json
	rm -f $(TARGET)/firefox/manifest-*.json

clean:
	rm -rf $(TARGET)

.PHONY: all clean firefox chrome
