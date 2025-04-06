import "./lib/browser-polyfill.js";
import { saveToStorage } from "./storage.js";
import { toggleContentMenus } from "./menu.js";

const BADGE_BACKGROUND_COLOR = '#d51b15';
const BADGE_TEXT_COLOR = '#ffffff';
const OPTIONS_VERSION = 3; // Increment when there are new options

let last_unread_count = 0;
let retryCount = 0;
let lastError = "";

function getBrowserName() {
  // Credit to https://github.com/mozilla/webextension-polyfill/issues/55#issuecomment-329676034 since polyfill makes old "check if browser is defined impossible"
  if (browser.runtime.id === 'theoldreader@knyar') {
    return 'Mozilla';
  } else {
    return 'Chrome';
  }
}

async function showNotification(title, body, id = "theoldreader") {
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

  browser.notifications.create(id, options);

  if (id == "theoldreader" && localStorage.notification_timeout > 0) {
    let timeout = localStorage.notification_timeout;

    // Chrome does not allow alarms shorter than 30 seconds
    if (getBrowserName() === "Chrome" && timeout < 30) {
      timeout = 30;
    }

    await browser.alarms.clear("notification-clear");
    browser.alarms.create(
      "notification-clear",
      {
        delayInMinutes: timeout / 60
      }
    );
  }
}

// Listener for browser.alarms.onAlarm
export function onAlarm(alarm) {
  switch (alarm.name) {
    case "notification-clear":
      browser.notifications.clear("theoldreader");
      break;
    case "server-refresh":
      getCountersFromHTTP();
      break;
  }
}

export async function onNotificationClick(id) {
  switch (id) {
    case "theoldreader":
      openOurTab();
      break;
    case "theoldreader-newOptions":
      await browser.runtime.openOptionsPage();
      break;
  }
  await browser.notifications.clear(id);
}

export function baseUrl() {
  return (localStorage.force_http == 'yes' ? 'http://theoldreader.com/' : 'https://theoldreader.com/');
}

async function findOurTab(windowId) {
  const tabs = await chrome.tabs.query(
    {
      url: "*://theoldreader.com/*",
      windowId: windowId
    }
  );

  return tabs[0];
}

export async function openOurTab(windowId) {
  const maybeTab = await findOurTab(windowId);

  if (maybeTab) {
    browser.tabs.update(maybeTab.id, {active: true});
  } else {
    let url = baseUrl();
    const pinned = (localStorage.prefer_pinned_tab == 'yes' ? true : false);
    if (localStorage.click_page == 'all_items') { url += 'posts/all'; }
    browser.tabs.create({url: url, pinned: pinned, windowId: windowId});
  }
}

function reportError(details) {
  console.warn(details.errorText);

  browser.action.setIcon({
    path: {
      19: 'img/icon-inactive.png',
      38: 'img/icon-inactive-scale2.png'
    }
  });

  if (details.loggedOut) {
    browser.action.setBadgeText({text: '!'});
    browser.action.setTitle({title: browser.i18n.getMessage('button_title_loggedOut')});
    if (lastError != details.errorText) { // Suppress repeat notifications about the same error
      showNotification(browser.i18n.getMessage('notification_loggedOut_title'), browser.i18n.getMessage('notification_loggedOut_body'));
    }
  } else {
    browser.action.setBadgeText({text: ''});
    browser.action.setTitle({title: browser.i18n.getMessage('button_title_fetchError')});
    if (lastError != details.errorText) { // Suppress repeat notifications about the same error
      showNotification(browser.i18n.getMessage('notification_fetchError_title'), browser.i18n.getMessage('notification_fetchError_body') + details.errorText);
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
  browser.action.setIcon({
    path: {
      19: 'img/icon-active.png',
      38: 'img/icon-active-scale2.png'
    }
  });

  browser.action.setBadgeBackgroundColor({color: BADGE_BACKGROUND_COLOR});
  // Not supported in Firefox
  browser.action.setBadgeTextColor?.({color: BADGE_TEXT_COLOR});
  browser.action.setBadgeText({text: count});
  browser.action.setTitle({title: 'The Old Reader' + title_suffix});

  lastError = ""; // Clear last remembered error

  if (countInt > last_unread_count) {
    const text = 'You have ' + countInt + ' unread post' + (countInt > 1 ? 's' : '') + '.';
    showNotification(browser.i18n.getMessage('notification_newPosts_title'), text);
  }
  last_unread_count = countInt;
}

export async function getCountersFromHTTP() {
  try {
    const response = await fetch(`${baseUrl()}reader/api/0/unread-count?output=json`);

    if (response.ok) {
      let feedData = await response.json();

      if (!isNaN(feedData?.max)) {
        retryCount = 0;
        updateIcon(feedData.max);
      } else {
        retryCount++;
        reportError({
          errorText: 'Unexpected data from server',
          loggedOut: false
        });
      }
    } else {
      retryCount++;
      reportError({
        errorText: `HTTP error ${response.status}`,
        loggedOut: response.status in [401, 403]
      });
    }
  } catch (error) {
    retryCount++;
    reportError({
      errorText: error.message,
      loggedOut: false
    });
  }

  scheduleRefresh();
}

function scheduleRefresh() {
  let intervalMinutes = Number(localStorage.refresh_interval) || 15;

  if (retryCount) { // There was an error
    intervalMinutes = Math.min(intervalMinutes, 0.5 * Math.pow(2, retryCount - 1));
    // 0.5m -> 1m -> 2m -> 4m -> 8m -> 16m -> ...
  }

  console.debug(`Scheduled refresh for ${intervalMinutes} minutes`);

  browser.alarms.clear("server-refresh");

  browser.alarms.create(
    "server-refresh",
    {
      delayInMinutes: intervalMinutes
    }
  );
}

export function onMessage(request, sender, callback) {
  console.debug(request);

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
    browser.tabs.create({
      url: request.url,
      active: false
    });
  }
}

function setCountFromObserver(count) {
  updateIcon(count);
  scheduleRefresh();
}

export function onExtensionUpdate(details) {
  if (details.reason == "update" && localStorage.options_version < OPTIONS_VERSION) {
    showNotification(
      browser.i18n.getMessage('notification_newOptions_title'),
      browser.i18n.getMessage('notification_newOptions_body'),
      "theoldreader-newOptions"
    );
  }
  localStorage.options_version = OPTIONS_VERSION;
  saveToStorage();
}

export async function startupInject() {
  // At this point, all old content scripts, if any, cannot communicate with the extension anymore
  // Old instances of content scripts have a "kill-switch" to terminate their event listeners
  // Here we inject new instances in existing tabs
  for await (const tab of browser.tabs.query({url: "*://theoldreader.com/*"})) {
    await browser.scripting.executeScript({files: ["js/observer.js"], target: { tabId: tab.id }});
  }
}
