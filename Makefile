PROJECT=theoldreader

SRC=source
TARGET=build

MKDIR=/bin/mkdir
MV=/bin/mv
CP_R=/bin/cp -r
ZIPPROG=/usr/bin/zip
RM=/bin/rm
RM_R=$(RM) -r

zip_all :: zip_chrome zip_firefox

zip_chrome:
	$(MKDIR) -p $(TARGET)/chrome && \
	$(CP_R) $(SRC)/* $(TARGET)/chrome && cd $(TARGET)/chrome && \
	$(MV) manifest-chrome.json manifest.json && \
	$(RM) manifest-firefox.json && \
	$(ZIPPROG) -r ../$(PROJECT)-chrome.zip ./* && cd ..

zip_firefox:
	$(MKDIR) -p $(TARGET)/firefox && \
	$(CP_R) $(SRC)/* $(TARGET)/firefox && cd $(TARGET)/firefox && \
	$(MV) manifest-firefox.json manifest.json && \
	$(RM) manifest-chrome.json && \
	$(ZIPPROG) -r ../$(PROJECT)-firefox.xpi ./* && cd ..

clean:
	$(RM_R) $(TARGET)
