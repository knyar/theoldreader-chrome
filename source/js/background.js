import "./lib/browser-polyfill.js";
import { getCountersFromHTTP, openOurTab, onMessage, onExtensionUpdate, onNotificationClick, startupInject, onAlarm } from "./functions.js";
import { onStorageChange, loadFromStorage } from "./storage.js";
import { toggleContentMenus, onContextMenuClick } from "./menu.js";

// synchronize settings
browser.storage.onChanged.addListener(onStorageChange);

// initialize button click event
browser.action.onClicked.addListener(function(tab) {
  openOurTab(tab.windowId);
});

// listen to injected scripts
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
  // Update local settings from sync storage
  await loadFromStorage();
  // turn on context menus
  await toggleContentMenus(localStorage.context_menu);
  // initially inject content scripts
  await startupInject();
  // run first counter refresh
  getCountersFromHTTP();
}
// On first install / subsequent updates, onStartup isn't guaranteed to fire
browser.runtime.onStartup.addListener(onStartup);
browser.runtime.onInstalled.addListener(onStartup);
