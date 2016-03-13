// vim: set ts=2 sw=2 et
var BADGE_BACKGROUND_COLOR = '#d73f31';
var OPTIONS_VERSION = 3; // Increment when there are new options

var refreshTimeout;
var last_unread_count = 0;
var notificationTimeout;
var retryCount = 0;
var lastError = "";

function showNotification(title, body) {
  if (localStorage.show_notifications != 'yes') {
    return;
  }

  var notification = new Notification(
    title,
    {
      icon: 'img/icon-48.png',
      body: body,
      tag: 'theoldreader-chrome'
    }
  );

  notification.onclick = function() { openOurTab(); this.close(); }; // Opens the Old Reader page and self-destructs

  window.clearTimeout(notificationTimeout); // If updating a notification, reset timeout
  if (localStorage.notification_timeout > 0) {
    notificationTimeout = window.setTimeout(
      function() { notification.cancel(); },
      localStorage.notification_timeout * 1000
    );
  }
}

function baseUrl() {
  return (localStorage.force_http == 'yes' ?
    'http://theoldreader.com/' : 'https://theoldreader.com/');
}

function findOurTab(callback, windowId) {
  chrome.tabs.query(
    {
      url: "*://theoldreader.com/*",
      windowId: windowId
    },
    function (tabs) {
      callback(tabs[0]);
    }
  );
}

function openOurTab(windowId) {
  findOurTab(function(tab) {
    if (tab) {
      chrome.tabs.update(tab.id, {selected: true});
    } else {
      var url = baseUrl();
      var pinned = (localStorage.prefer_pinned_tab == 'yes' ? true : false);
      if (localStorage.click_page == 'all_items') { url += 'posts/all'; }
      chrome.tabs.create({url: url, pinned: pinned, windowId: windowId});
    }
  }, windowId);
}

function reportError(details) {
  console.warn(details.errorText);

  chrome.browserAction.setIcon({
    path: {
      '19': 'img/icon-inactive.png',
      '38': 'img/icon-inactive-scale2.png'
    }
  });

  if (details.loggedOut) {
    chrome.browserAction.setBadgeText({text: '!'});
    chrome.browserAction.setTitle({title: 'Logged out, click to log in'});
    if (lastError != details.errorText) { // Suppress repeat notifications about the same error
      showNotification('Logged out', "Click here to log in");
    }
  } else {
    chrome.browserAction.setBadgeText({text: ''});
    chrome.browserAction.setTitle({title: 'Error fetching feed counts'});
    if (lastError != details.errorText) { // Suppress repeat notifications about the same error
      showNotification('Error', "Failed to fetch feed counts: "+details.errorText);
    }
  }

  lastError = details.errorText; // Remember last error

  console.warn("Error fetching feed counts, " + retryCount + " time(s) in a row");
}

function updateIcon(count) {
  countInt = parseInt(count);
  title_suffix = ': ' + countInt + ' unread';
  if (countInt === 0) {
    count = "";
    title_suffix = '';
  } else if (countInt > 999) {
    count = "999+";
  } else {
    count = countInt.toString();
  }
  chrome.browserAction.setIcon({
    path: {
      '19': 'img/icon-active.png',
      '38': 'img/icon-active-scale2.png'
    }
  });
  chrome.browserAction.setBadgeBackgroundColor({color: BADGE_BACKGROUND_COLOR});
  chrome.browserAction.setBadgeText({text: count});
  chrome.browserAction.setTitle({title: 'The Old Reader' + title_suffix});

  lastError = ""; // Clear last remembered error

  if (countInt > last_unread_count) {
    var text = 'You have ' + countInt + ' unread post' + (countInt > 1 ? 's' : '') + '.';
    showNotification('New posts', text);
  }
  last_unread_count = countInt;
}

function getCountersFromHTTP() {
  // If request times out or if we get unexpected output, report error and reschedule
  function refreshFailed(details) {
    window.clearTimeout(requestTimeout);
    retryCount++;
    reportError(details);
    scheduleRefresh();
  }

  // If request succeeds, update counters and reschedule
  function refreshSucceeded(feedData) {
    if (feedData && !isNaN(feedData.max)) {
      updateIcon(feedData.max);
    } else {
      reportError({errorText: 'Unexpected data from server'});
    }
    retryCount = 0;
    scheduleRefresh();
  }

  var httpRequest = new XMLHttpRequest();
  var requestTimeout = window.setTimeout(function() {
    httpRequest.abort();
    refreshFailed({errorText: 'HTTP request timed out'});
  }, 20000);

  httpRequest.onerror = function(err) {
    refreshFailed({errorText: 'HTTP request error'}); // No usable error data in err
  };

  httpRequest.onreadystatechange = function() {
    if (httpRequest.readyState == 4 && httpRequest.status !== 0) { // (4,0) means onerror will be fired next
      if (httpRequest.status >= 400) {
        refreshFailed({
          errorText : 'Got HTTP error: ' + httpRequest.status + ' (' + httpRequest.statusText + ')',
          loggedOut : (httpRequest.status == 403 || httpRequest.status == 401)
        });
      } else if (httpRequest.responseText) {
        window.clearTimeout(requestTimeout);
        var feedData;
        try {
          feedData = JSON.parse(httpRequest.responseText);
          refreshSucceeded(feedData);
        } catch (exception) {
          refreshFailed({errorText: 'Exception while parsing json: ' + exception.toString()});
        }
      } else {
        refreshFailed({errorText: 'Empty response'});
      }
    }
  };

  try {
    httpRequest.open('GET', baseUrl() + 'reader/api/0/unread-count?output=json', true);
    httpRequest.send(null);
  } catch (exception) {
    refreshFailed({errorText: 'Exception while fetching data: ' + exception.toString()});
  }
}

function scheduleRefresh() {
  var interval = (localStorage.refresh_interval || 15) * 60 * 1000;
  window.clearTimeout(refreshTimeout);
  if(retryCount){ // There was an error
    interval = Math.min( interval, 5 * 1000 * Math.pow(2, retryCount-1));
    // 0:05 -> 0:10 -> 0:20 -> 0:40 -> 1:20 -> 2:40 -> 5:20 -> ...
  }
  refreshTimeout = window.setTimeout(getCountersFromHTTP, interval);
}

function onMessage(request, sender, callback) {
  if (typeof request.count !== 'undefined') {
    setCountFromObserver(request.count);
  }
  if (request.sync) {
    saveToStorage(callback);
    return true; // Allow asynchronous callback
  }
  if (request.toggleContextMenus) {
    toggleContentMenus(localStorage.context_menu);
  }
  if (request.openInBackground) {
    chrome.tabs.create({
      url: request.url,
      active: false
    });
  }
}

function setCountFromObserver(count) {
  updateIcon(count);
  scheduleRefresh();
}

function onExtensionUpdate(details) {
  if (details.reason == "update" && localStorage.options_version < OPTIONS_VERSION) { // Negation required to capture undefined
    var notification = new Notification(
        "New options available",
        { body: "Click to configure new options",
          icon: 'img/icon-48.png' }
    );
    notification.onclick = function() {
      chrome.tabs.create({url: chrome.runtime.getURL("options.html")});
      this.close();
    };
  }
  localStorage.options_version = OPTIONS_VERSION;
  saveToStorage();
}

function startupInject() {
  // At this point, all old content scripts, if any, cannot communicate with the extension anymore
  // Old instances of content scripts have a "kill-switch" to terminate their event listeners
  // Here we inject new instances in existing tabs
  chrome.tabs.query(
    {url: "*://theoldreader.com/*"},
    function (tabs) {
      for (var i in tabs) {
        chrome.tabs.executeScript(tabs[i].id, {file: "js/observer.js"});
      }
    }
  );
}
