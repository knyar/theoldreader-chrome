var COUNTER_REFRESH_INTERVAL = 180000;

var refreshTimeout;

function findOurTab(callback) {
  chrome.windows.getAll({populate: true}, function(windows) {
    var foundTab = null;
    var i, win;
    for (i = 0; win = windows[i]; i++) {
      var j, tab;
      for (j = 0; tab = win.tabs[j]; j++) {
        if (tab.url && /^http:\/\/(?:www\.)?theoldreader\.com/.test(tab.url)) {
          foundTab = tab;
        }
      }
    }
    callback(foundTab);
  });
}

function openOurTab() {
  findOurTab(function(tab) {
    if (tab) {
      chrome.tabs.update(tab.id, {selected: true});
    } else {
      chrome.tabs.create({url: 'http://theoldreader.com/'});
    }
  });
}

function reportError() {
  chrome.browserAction.setIcon({path: 'icon-inactive.png'});
  chrome.browserAction.setBadgeText({text: ''});
}

function updateIcon(count) {
  if (count == "0") { count = "" }
  chrome.browserAction.setIcon({path: 'icon-active.png'});
  chrome.browserAction.setBadgeBackgroundColor({color: '#3A87AD'});
  chrome.browserAction.setBadgeText({text: count});
}

function parseCounters(feedData) {
  var unread_count = 0;

  var i, folder;
  for (i=0; folder=feedData.feeds[i]; i++) {
    var k, feed;
    for (k=0; feed=folder.feeds[k]; k++) {
      if (feed.unread_count) {
        unread_count += feed.unread_count;
      }
    }
  }
  for (i=0; folder=feedData.following[i]; i++) {
    if (folder.unread_count) {
      unread_count += folder.unread_count;
    }
  }
  updateIcon(unread_count.toString());
}

function refreshCounters() {
  if (refreshTimeout) { window.clearInterval(refreshTimeout) }

  findOurTab(function(tab) {
    var count;
    if (tab && tab.title) {
      var match = /^The Old Reader \((\d+)\)$/.exec(tab.title);
      if (match && match[1]) {
        count = match[1];
      }
    }
    if (count) {
      console.log("Found counter in our tab (" + count + "), no need to fetch counters via http");
      updateIcon(count);
      scheduleRefresh();
    } else {
      getCountersFromHTTP();
    }
  });
}

function getCountersFromHTTP() {
  // If request times out or if we get unexpected output, report error and reschedule
  function refreshFailed() {
    window.clearTimeout(requestTimeout);
    reportError();
    scheduleRefresh();
  }

  // If request succeeds, update counters and reschedule
  function refreshSucceeded(feedData) {
    parseCounters(feedData);
    scheduleRefresh();
  }

  var httpRequest = new XMLHttpRequest();
  var requestTimeout = window.setTimeout(function() {
    httpRequest.abort();
    reportError();
    scheduleRefresh();
  }, 20000);

  httpRequest.onerror = function(err) {
    console.log(err);
    refreshFailed();
  }

  httpRequest.onreadystatechange = function() {
    if (httpRequest.readyState == 4) {
      if (httpRequest.status >= 400) {
        console.log('Got HTTP error: ' + httpRequest.status + ' (' + httpRequest.statusText + ')');
        refreshFailed();
      } else if (httpRequest.responseText) {
        window.clearTimeout(requestTimeout);
        var feedData;
        try {
          feedData = JSON.parse(httpRequest.responseText);
          refreshSucceeded(feedData);
        } catch (exception) {
          console.log('Exception while parsing json: ' + exception);
          refreshFailed();
        }
      } else {
        console.log('Got nothing!');
        refreshFailed();
      }
    }
  }

  try {
    httpRequest.open('GET', 'http://theoldreader.com/feeds.json', true);
    httpRequest.send(null);
  } catch (exception) {
    console.log('Exception while fetching data: ' + exception);
    refreshFailed();
  }
}

function scheduleRefresh() {
  if (refreshTimeout) { window.clearInterval(refreshTimeout); }
  refreshTimeout = window.setTimeout(refreshCounters, COUNTER_REFRESH_INTERVAL);
}

