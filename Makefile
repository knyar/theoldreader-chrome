PROJECT=theoldreader

SRC=source
TARGET=build

SOURCES = $(shell find $(SRC) -print)

# Preserve builds
.SECONDARY: $(TARGET)/chrome/ $(TARGET)/firefox/

all: chrome firefox

firefox: $(TARGET)/$(PROJECT)-firefox.zip

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
	zip -qr $(TARGET)/$(PROJECT)-$*.zip $(TARGET)/$*/*

clean:
	rm -rf $(TARGET)

.PHONY: all clean firefox chrome
