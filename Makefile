PROJECT=theoldreader

SRC=source
TARGET=build

SOURCES = $(shell find $(SRC) -print)

# Preserve builds
.SECONDARY: $(TARGET)/chrome/ $(TARGET)/firefox/

all: chrome firefox

firefox: $(TARGET)/$(PROJECT)-firefox.xpi

chrome: $(TARGET)/$(PROJECT)-chrome.zip

$(TARGET)/%/: $(SOURCES)
	@echo "\n*** Rebuilding $* ***\n"
	mkdir -p $@
	rm -rf $(TARGET)/$*/*
	cp -r $(SRC)/* $@
	mv $(TARGET)/$*/manifest-$*.json $(TARGET)/$*/manifest.json
	rm -f $(TARGET)/$*/manifest-*.json

$(TARGET)/$(PROJECT)-%.zip: $(TARGET)/%/
	@echo "\n*** Rebuilding $*.zip ***\n"
	cd $(TARGET)/$* && zip -qr ../$(PROJECT)-$*.zip *

$(TARGET)/$(PROJECT)-%.xpi: $(TARGET)/%/
	@echo "\n*** Rebuilding $*.xpi ***\n"
	cd $(TARGET)/$* && zip -qr ../$(PROJECT)-$*.xpi *

clean:
	rm -rf $(TARGET)

.PHONY: all clean firefox chrome
