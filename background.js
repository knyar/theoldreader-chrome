// run first counter refresh
refreshCounters();

// initialize button click event
chrome.browserAction.onClicked.addListener(function(tab) {
  openOurTab();
});

