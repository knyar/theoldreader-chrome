import "./lib/browser-polyfill.js";
import { getSettings, getState, setState, saveToSync } from "./storage.js";

const BADGE_BACKGROUND_COLOR = '#d51b15';
const BADGE_TEXT_COLOR = '#ffffff';
const OPTIONS_VERSION = 3; // Increment when there are new options
const REQUEST_TIMEOUT_MS = 20000;

// Absolute paths, so they resolve from the extension root and not relative
// to the service worker script location.
const ICON_ACTIVE = {19: '/img/icon-active.png', 38: '/img/icon-active-scale2.png'};
const ICON_INACTIVE = {19: '/img/icon-inactive.png', 38: '/img/icon-inactive-scale2.png'};

function getBrowserName() {
  // Credit to https://github.com/mozilla/webextension-polyfill/issues/55#issuecomment-329676034 since polyfill makes old "check if browser is defined impossible"
  if (browser.runtime.id === 'theoldreader@knyar') {
    return 'Mozilla';
  } else {
    return 'Chrome';
  }
}

async function showNotification(title, body, id = "theoldreader") {
  const settings = await getSettings();

  if (id != "theoldreader-newOptions" && settings.show_notifications != 'yes') {
    return;
  }

  let options = {
    iconUrl: browser.runtime.getURL('img/icon-48.png'),
    type: 'basic',
    title: title,
    message: body
  };

  if (getBrowserName() == "Chrome") {
    // Sadly, there is no way to keep a notification open in FF, only in Chrome
    options.requireInteraction = true;
  }

  await browser.notifications.create(id, options);

  const notificationTimeout = Number(settings.notification_timeout) || 0;
  if (id == "theoldreader" && notificationTimeout > 0) {
    let timeout = notificationTimeout;

    // Chrome does not allow alarms shorter than 30 seconds
    if (getBrowserName() === "Chrome" && timeout < 30) {
      timeout = 30;
    }

    await browser.alarms.clear("notification-clear");
    await browser.alarms.create(
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
      await openOurTab();
      break;
    case "theoldreader-newOptions":
      await browser.runtime.openOptionsPage();
      break;
  }
  await browser.notifications.clear(id);
}

export async function baseUrl() {
  const { force_http } = await getSettings();
  return (force_http == 'yes' ? 'http://theoldreader.com/' : 'https://theoldreader.com/');
}

async function findOurTab(windowId) {
  const query = {url: "*://theoldreader.com/*"};
  if (typeof windowId !== "undefined") {
    query.windowId = windowId;
  }
  const tabs = await browser.tabs.query(query);

  return tabs[0];
}

export async function openOurTab(windowId) {
  const maybeTab = await findOurTab(windowId);

  if (maybeTab) {
    await browser.tabs.update(maybeTab.id, {active: true});
    await browser.windows.update(maybeTab.windowId, {focused: true});
  } else {
    const settings = await getSettings();
    let url = await baseUrl();
    const pinned = (settings.prefer_pinned_tab == 'yes');
    if (settings.click_page == 'all_items') { url += 'posts/all'; }
    const createProperties = {url: url, pinned: pinned};
    if (typeof windowId !== "undefined") {
      createProperties.windowId = windowId;
    }
    await browser.tabs.create(createProperties);
  }
}

async function reportError(details) {
  const { last_error, retry_count } = await getState();

  console.warn(details.errorText);

  await browser.action.setIcon({path: ICON_INACTIVE});

  if (details.loggedOut) {
    await browser.action.setBadgeText({text: '!'});
    await browser.action.setTitle({title: browser.i18n.getMessage('button_title_loggedOut')});
    if (last_error != details.errorText) { // Suppress repeat notifications about the same error
      await showNotification(browser.i18n.getMessage('notification_loggedOut_title'), browser.i18n.getMessage('notification_loggedOut_body'));
    }
  } else {
    await browser.action.setBadgeText({text: ''});
    await browser.action.setTitle({title: browser.i18n.getMessage('button_title_fetchError')});
    if (last_error != details.errorText) { // Suppress repeat notifications about the same error
      await showNotification(browser.i18n.getMessage('notification_fetchError_title'), browser.i18n.getMessage('notification_fetchError_body') + details.errorText);
    }
  }

  await setState({last_error: details.errorText}); // Remember last error

  console.warn("Error fetching feed counts, " + retry_count + " time(s) in a row");
}

async function updateIcon(count) {
  const { last_unread_count } = await getState();

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

  await browser.action.setIcon({path: ICON_ACTIVE});
  await browser.action.setBadgeBackgroundColor({color: BADGE_BACKGROUND_COLOR});
  // Not supported in Firefox
  await browser.action.setBadgeTextColor?.({color: BADGE_TEXT_COLOR});
  await browser.action.setBadgeText({text: count});
  await browser.action.setTitle({title: 'The Old Reader' + title_suffix});

  // Clear last remembered error, remember the count
  await setState({last_error: "", last_unread_count: countInt});

  if (countInt > last_unread_count) {
    const text = 'You have ' + countInt + ' unread post' + (countInt > 1 ? 's' : '') + '.';
    await showNotification(browser.i18n.getMessage('notification_newPosts_title'), text);
  }
}

export async function getCountersFromHTTP() {
  try {
    const response = await fetch(`${await baseUrl()}reader/api/0/unread-count?output=json`, {
      credentials: "include",
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (response.ok) {
      let feedData = null;
      try {
        feedData = await response.json();
      } catch {
        // Not JSON, e.g. a login page; handled below
      }

      if (feedData && !isNaN(feedData.max)) {
        await setState({retry_count: 0});
        await updateIcon(feedData.max);
      } else {
        await increaseRetryCount();
        await reportError({
          errorText: 'Unexpected data from server',
          loggedOut: false
        });
      }
    } else {
      await increaseRetryCount();
      await reportError({
        errorText: `HTTP error ${response.status}`,
        loggedOut: [401, 403].includes(response.status)
      });
    }
  } catch (error) {
    await increaseRetryCount();
    await reportError({
      errorText: error.message,
      loggedOut: false
    });
  }

  await scheduleRefresh();
}

async function increaseRetryCount() {
  const { retry_count } = await getState();
  await setState({retry_count: retry_count + 1});
}

export async function scheduleRefresh() {
  const settings = await getSettings();
  const { retry_count } = await getState();

  let intervalMinutes = Number(settings.refresh_interval) || 15;

  if (retry_count) { // There was an error
    intervalMinutes = Math.min(intervalMinutes, 0.5 * Math.pow(2, retry_count - 1));
    // 0.5m -> 1m -> 2m -> 4m -> 8m -> 16m -> ...
  }

  console.debug(`Scheduled refresh for ${intervalMinutes} minutes`);

  await browser.alarms.clear("server-refresh");
  await browser.alarms.create(
    "server-refresh",
    {
      delayInMinutes: intervalMinutes
    }
  );
}

export function onMessage(request) {
  console.debug(request);

  if (typeof request.count !== 'undefined') {
    return setCountFromObserver(request.count);
  }
  if (request.openInBackground) {
    return browser.tabs.create({
      url: request.url,
      active: false
    }).then(() => true);
  }
  if (request.refreshNow) {
    return getCountersFromHTTP().then(() => true);
  }
}

async function setCountFromObserver(count) {
  await setState({retry_count: 0});
  await updateIcon(count);
  await scheduleRefresh();
  return true;
}

export async function onExtensionUpdate(details) {
  const settings = await getSettings();
  const optionsVersion = Number(settings.options_version) || 0;

  if (details.reason == "update" && optionsVersion < OPTIONS_VERSION) {
    await showNotification(
      browser.i18n.getMessage('notification_newOptions_title'),
      browser.i18n.getMessage('notification_newOptions_body'),
      "theoldreader-newOptions"
    );
  }
  await browser.storage.local.set({options_version: OPTIONS_VERSION});
  await saveToSync();
}

export async function startupInject() {
  // At this point, all old content scripts, if any, cannot communicate with the extension anymore
  // Old instances of content scripts have a "kill-switch" to terminate their event listeners
  // Here we inject new instances in existing tabs
  for (const tab of await browser.tabs.query({url: "*://theoldreader.com/*"})) {
    try {
      await browser.scripting.executeScript({files: ["js/observer.js"], target: { tabId: tab.id }});
    } catch (error) {
      // E.g. a tab that is still loading or showing an error page
      console.warn(`Could not inject into tab ${tab.id}: `, error.message);
    }
  }
}
