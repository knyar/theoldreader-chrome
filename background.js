// vim: set ts=2 sw=2 et
// run first counter refresh
getCountersFromHTTP();

// initialize button click event
chrome.browserAction.onClicked.addListener(function(tab) {
  openOurTab();
});

// listen to injected scripts
chrome.extension.onMessage.addListener(onMessage);

// alert about new features, if any
chrome.runtime.onInstalled.addListener(onExtensionUpdate);

// initially inject content scripts
startupInject();
