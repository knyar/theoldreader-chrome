import "./lib/browser-polyfill.js";
import { getCountersFromHTTP, openOurTab, onMessage, onExtensionUpdate, onNotificationClick, startupInject, onAlarm, scheduleRefresh } from "./functions.js";
import { getSettings, loadFromSync, migrateFromLocalStorage, applySyncChanges } from "./storage.js";
import { toggleContentMenus, onContextMenuClick } from "./menu.js";

// All listeners are registered synchronously at the top level, so that they
// are in place whenever the service worker is woken up by an event.

// synchronize settings
browser.storage.onChanged.addListener(async(changes, area) => {
  if (area == "sync") {
    // Settings changed on another device
    if (await applySyncChanges(changes)) {
      // Ignoring possible errors: if there is no options page open, it will reject harmlessly
      browser.runtime.sendMessage({update: true}).catch(() => {});
    }
  } else if (area == "local") {
    if ("context_menu" in changes) {
      await toggleContentMenus(changes.context_menu.newValue);
    }
    if ("refresh_interval" in changes) {
      await scheduleRefresh();
    }
    if ("force_http" in changes) {
      await getCountersFromHTTP();
    }
  }
});

// initialize button click event
browser.action.onClicked.addListener(function(tab) {
  openOurTab(tab.windowId);
});

// listen to injected scripts and the options page
browser.runtime.onMessage.addListener(onMessage);

// alert about new features, if any
browser.runtime.onInstalled.addListener(onExtensionUpdate);

// react to notification clicks
browser.notifications.onClicked.addListener(onNotificationClick);

// react to notification timeout alarm
browser.alarms.onAlarm.addListener(onAlarm);

// react to context menu clicks
browser.contextMenus.onClicked.addListener(onContextMenuClick);

// do some startup initialization
// this is reentrant (calling it multiple times isn't harmful)
async function onStartup() {
  // Settings from versions <= 1.5.3 (only readable on Firefox here)
  await migrateFromLocalStorage();
  // Update local settings from sync storage
  await loadFromSync();
  // turn on context menus
  const settings = await getSettings();
  await toggleContentMenus(settings.context_menu);
  // initially inject content scripts
  await startupInject();
  // run first counter refresh
  await getCountersFromHTTP();
}
// On first install / subsequent updates, onStartup isn't guaranteed to fire
browser.runtime.onStartup.addListener(onStartup);
browser.runtime.onInstalled.addListener(onStartup);
