// vim: set ts=2 sw=2 et
var BADGE_BACKGROUND_COLOR = '#d73f31';
var OPTIONS_VERSION = 1; // Increment when there are new options

var refreshTimeout;
var last_unread_count = 0;
var notificationTimeout;

function showNotification(title, body) {
  if (localStorage['show_notifications'] != 'yes') {
    return;
  }
  
  var notification = webkitNotifications.createNotification('icon-48.png', title, body);
  notification.tag = "theoldreader-chrome"; // Will update the notification instead of creating a new one
  notification.onclick = function() { openOurTab(); this.close(); } // Opens the Old Reader page and self-destructs
  
  window.clearTimeout(notificationTimeout); // If updating a notification, reset timeout
  if (localStorage['notification_timeout'] > 0) {
    notificationTimeout = window.setTimeout( 
      function() { notification.cancel(); }, 
      localStorage['notification_timeout'] * 1000
    );
  }
  
  notification.show();
}

function findOurTab(callback) {
  chrome.tabs.query(
    {url: "*://theoldreader.com/*"},
    function (tabs) {
      callback(tabs[0]);
    }
  );
}

function openOurTab() {
  findOurTab(function(tab) {
    if (tab) {
      chrome.tabs.update(tab.id, {selected: true});
    } else {
      var url = (localStorage['prefer_https'] == 'yes' ? 'https://theoldreader.com/' : 'http://theoldreader.com/');
      if (localStorage['click_page'] == 'all_items') { url += 'posts/all'; }
      chrome.tabs.create({url: url});
    }
  });
}

function reportError() {
  chrome.browserAction.setIcon({path: 'icon-inactive.png'});
  chrome.browserAction.setBadgeText({text: ''});
  chrome.browserAction.setTitle({title: 'Error fetching feed counts'});

  showNotification('Error', 'Failed to fetch feed counts');
}

function updateIcon(count) {
  countInt = parseInt(count);
  title_suffix = ': ' + countInt + ' unread';
  if (countInt == 0) {
    count = "";
    title_suffix = '';
  } else if (countInt > 999) {
    count = "999+";
  } else {
    count = countInt.toString();
  }
  chrome.browserAction.setIcon({path: 'icon-active.png'});
  chrome.browserAction.setBadgeBackgroundColor({color: BADGE_BACKGROUND_COLOR});
  chrome.browserAction.setBadgeText({text: count});
  chrome.browserAction.setTitle({title: 'The Old Reader' + title_suffix});

  if (countInt > last_unread_count) {
    var text = 'You have ' + countInt + ' unread post' + (countInt > 1 ? 's' : '') + '.';
    showNotification('New posts', text);
  }
  last_unread_count = countInt;
}

function parseCounters(feedData) {
  var unread_count = 0;

  if(!feedData.feeds) {
    return reportError()
  }

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
  updateIcon(unread_count)
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
    if (localStorage['prefer_https'] == 'yes') {
      httpRequest.open('GET', 'https://theoldreader.com/feeds/counts.json', true);
    } else {
      httpRequest.open('GET', 'http://theoldreader.com/feeds/counts.json', true);
    }
    httpRequest.send(null);
  } catch (exception) {
    console.log('Exception while fetching data: ' + exception);
    refreshFailed();
  }
}

function scheduleRefresh() {
  window.clearTimeout(refreshTimeout);
  refreshTimeout = window.setTimeout(getCountersFromHTTP, (localStorage['refresh_interval'] || 15)*60*1000);
}

function onMessage(request, sender, callback) {
  if(typeof request.count !== 'undefined'){
    setCountFromObserver(request.count);
  }
}

function setCountFromObserver(count) {
  console.log("Observer reported (" + count + "), no need to update for now");
  updateIcon(count);
  scheduleRefresh();
}

function onExtensionUpdate(details) {
  if (details.reason == "update" && !(localStorage["options_version"] >= OPTIONS_VERSION)) { // Negation required to capture undefined
    var notification = webkitNotifications.createNotification('icon-48.png', "New options available", "Click to configure new options");
    notification.onclick = function() { chrome.tabs.create({url: chrome.extension.getURL("options.html")}); this.close(); }
    notification.show();
  }
  localStorage["options_version"] = OPTIONS_VERSION;
}
