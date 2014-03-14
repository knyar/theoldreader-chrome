// vim: set ts=2 sw=2 et
// synchronize settings
chrome.storage.onChanged.addListener(onStorageChange);
loadFromStorage();

// run first counter refresh
getCountersFromHTTP();

// initialize button click event
chrome.browserAction.onClicked.addListener(function(tab) {
  openOurTab(tab.windowId);
});

// listen to injected scripts
chrome.runtime.onMessage.addListener(onMessage);

// alert about new features, if any
chrome.runtime.onInstalled.addListener(onExtensionUpdate);

// initially inject content scripts
startupInject();
