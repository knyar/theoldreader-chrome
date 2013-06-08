var HTTP_REFRESH_INTERVAL = 15*60*1000;  // 15 minutes
var BADGE_BACKGROUND_COLOR = '#d73f31';

var refreshTimeout;
var last_unread_count = -1;

function showNotification(title, body) {
  if (localStorage['show_notifications'] != 'yes') {
    return;
  }
  var notification = webkitNotifications.createNotification('icon-48.png', title, body);
  notification.show();
}

function findOurTab(callback) {
  chrome.windows.getAll({populate: true}, function(windows) {
    var foundTab, i, win;
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
      var url_suffix = '';
      if (localStorage['click_page'] == 'all_items') {
          url_suffix = 'posts/all'
      }
      console.log('url_suffix = ' + url_suffix);
      chrome.tabs.create({url: 'http://theoldreader.com/' + url_suffix});
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
    httpRequest.open('GET', 'http://theoldreader.com/feeds/counts.json', true);
    httpRequest.send(null);
  } catch (exception) {
    console.log('Exception while fetching data: ' + exception);
    refreshFailed();
  }
}

function scheduleRefresh() {
  if (refreshTimeout) { window.clearTimeout(refreshTimeout) }
  refreshTimeout = window.setTimeout(getCountersFromHTTP, HTTP_REFRESH_INTERVAL);
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
