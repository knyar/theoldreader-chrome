/* globals saveToStorage, toggleContentMenus */
const BADGE_BACKGROUND_COLOR = '#d73f31';
const OPTIONS_VERSION = 3; // Increment when there are new options

let refreshTimeout;
let last_unread_count = 0;
let notificationTimeout;
let retryCount = 0;
let lastError = "";

function getBrowserName() {
  if (typeof browser !== 'undefined') {
    return 'Mozilla';
  } else {
    return 'Chrome';
  }
}

function showNotification(title, body, id = "theoldreader") {
  if (id != "theoldreader-newOptions" && localStorage.show_notifications != 'yes') {
    return;
  }

  let options = {
    iconUrl: 'img/icon-48.png',
    type: 'basic',
    title: title,
    message: body
  };

  if (getBrowserName() == "Chrome") {
    // Sadly, there is no way to keep a notification open in FF, only in Chrome
    options.requireInteraction = true;
    options.isClickable = true;
  }

  chrome.notifications.create(id, options);

  if (id == "theoldreader" && localStorage.notification_timeout > 0) {
    window.clearTimeout(notificationTimeout); // If updating a notification, reset timeout
    notificationTimeout = window.setTimeout(
      function() { chrome.notifications.clear("theoldreader"); },
      localStorage.notification_timeout * 1000
    );
  }
}

/* exported onNotificationClick */
function onNotificationClick(id) {
  switch (id) {
    case "theoldreader":
      openOurTab();
      break;
    case "theoldreader-newOptions":
      chrome.runtime.openOptionsPage();
      break;
  }
  chrome.notifications.clear(id);
}

function baseUrl() {
  return (localStorage.force_http == 'yes' ? 'http://theoldreader.com/' : 'https://theoldreader.com/');
}

function findOurTab(callback, windowId) {
  chrome.tabs.query(
    {
      url: "*://theoldreader.com/*",
      windowId: windowId
    },
    function(tabs) {
      callback(tabs[0]);
    }
  );
}

function openOurTab(windowId) {
  findOurTab(function(tab) {
    if (tab) {
      chrome.tabs.update(tab.id, {active: true});
    } else {
      let url = baseUrl();
      const pinned = (localStorage.prefer_pinned_tab == 'yes' ? true : false);
      if (localStorage.click_page == 'all_items') { url += 'posts/all'; }
      chrome.tabs.create({url: url, pinned: pinned, windowId: windowId});
    }
  }, windowId);
}

function reportError(details) {
  console.warn(details.errorText);

  chrome.browserAction.setIcon({
    path: {
      19: 'img/icon-inactive.png',
      38: 'img/icon-inactive-scale2.png'
    }
  });

  if (details.loggedOut) {
    chrome.browserAction.setBadgeText({text: '!'});
    chrome.browserAction.setTitle({title: chrome.i18n.getMessage('button_title_loggedOut')});
    if (lastError != details.errorText) { // Suppress repeat notifications about the same error
      showNotification(chrome.i18n.getMessage('notification_loggedOut_title'), chrome.i18n.getMessage('notification_loggedOut_body'));
    }
  } else {
    chrome.browserAction.setBadgeText({text: ''});
    chrome.browserAction.setTitle({title: chrome.i18n.getMessage('button_title_fetchError')});
    if (lastError != details.errorText) { // Suppress repeat notifications about the same error
      showNotification(chrome.i18n.getMessage('notification_fetchError_title'), chrome.i18n.getMessage('notification_fetchError_body') + details.errorText);
    }
  }

  lastError = details.errorText; // Remember last error

  console.warn("Error fetching feed counts, " + retryCount + " time(s) in a row");
}

function updateIcon(count) {
  let countInt = parseInt(count);
  let title_suffix = ': ' + countInt + ' unread';
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
      19: 'img/icon-active.png',
      38: 'img/icon-active-scale2.png'
    }
  });
  chrome.browserAction.setBadgeBackgroundColor({color: BADGE_BACKGROUND_COLOR});
  chrome.browserAction.setBadgeText({text: count});
  chrome.browserAction.setTitle({title: 'The Old Reader' + title_suffix});

  lastError = ""; // Clear last remembered error

  if (countInt > last_unread_count) {
    const text = 'You have ' + countInt + ' unread post' + (countInt > 1 ? 's' : '') + '.';
    showNotification(chrome.i18n.getMessage('notification_newPosts_title'), text);
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

  let httpRequest = new XMLHttpRequest();
  let requestTimeout = window.setTimeout(function() {
    httpRequest.abort();
    refreshFailed({errorText: 'HTTP request timed out'});
  }, 20000);

  httpRequest.onerror = function() {
    refreshFailed({errorText: 'HTTP request error'});
  };

  httpRequest.onreadystatechange = function() {
    if (httpRequest.readyState == 4 && httpRequest.status !== 0) { // (4,0) means onerror will be fired next
      if (httpRequest.status >= 400) {
        refreshFailed({
          errorText: 'Got HTTP error: ' + httpRequest.status + ' (' + httpRequest.statusText + ')',
          loggedOut: (httpRequest.status == 403 || httpRequest.status == 401)
        });
      } else if (httpRequest.responseText) {
        window.clearTimeout(requestTimeout);
        try {
          let feedData = JSON.parse(httpRequest.responseText);
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
  let interval = (localStorage.refresh_interval || 15) * 60 * 1000;
  window.clearTimeout(refreshTimeout);
  if (retryCount) { // There was an error
    interval = Math.min(interval, 5 * 1000 * Math.pow(2, retryCount - 1));
    // 0:05 -> 0:10 -> 0:20 -> 0:40 -> 1:20 -> 2:40 -> 5:20 -> ...
  }
  refreshTimeout = window.setTimeout(getCountersFromHTTP, interval);
}

/* exported onMessage */
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
  if (request.type == 'close-this-tab' && typeof sender.tab !== 'undefined') {
    chrome.tabs.remove(sender.tab.id);
  }
}

function setCountFromObserver(count) {
  updateIcon(count);
  scheduleRefresh();
}

/* exported onExtensionUpdate */
function onExtensionUpdate(details) {
  if (details.reason == "update" && localStorage.options_version < OPTIONS_VERSION) {
    showNotification(
      chrome.i18n.getMessage('notification_newOptions_title'),
      chrome.i18n.getMessage('notification_newOptions_body'),
      "theoldreader-newOptions"
    );
  }
  localStorage.options_version = OPTIONS_VERSION;
  saveToStorage();
}

/* exported startupInject */
function startupInject() {
  // At this point, all old content scripts, if any, cannot communicate with the extension anymore
  // Old instances of content scripts have a "kill-switch" to terminate their event listeners
  // Here we inject new instances in existing tabs
  chrome.tabs.query(
    {url: "*://theoldreader.com/*"},
    function(tabs) {
      for (let tab of tabs) {
        chrome.tabs.executeScript(tab.id, {file: "js/observer.js"});
      }
    }
  );
}
