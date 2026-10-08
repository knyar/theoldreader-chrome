// Settings and runtime state storage.
//
// Manifest V3 background code runs in a service worker (Chrome), where
// window.localStorage does not exist. All settings therefore live in
// browser.storage.local (mirrored to browser.storage.sync when enabled),
// and runtime state that must survive the service worker being suspended
// lives in browser.storage.session.

import "./lib/browser-polyfill.js";

// Values are kept in the same string format as the old localStorage-based
// versions, so that data already in sync storage stays compatible.
export const DEFAULTS = {
  click_page: "home",
  show_notifications: "no",
  notification_timeout: "0",
  force_http: "no",
  prefer_pinned_tab: "no",
  refresh_interval: "15",
  use_sync: "yes",
  context_menu: "yes",
};

const SETTING_KEYS = Object.keys(DEFAULTS);
// "use_sync" is a per-device decision and is never pulled from sync storage
const SYNCED_KEYS = SETTING_KEYS.filter((key) => key != "use_sync");

export async function getSettings() {
  const stored = await browser.storage.local.get([...SETTING_KEYS, "options_version"]);
  return {...DEFAULTS, ...stored};
}

export async function setSettings(values) {
  await browser.storage.local.set(values);
}

// One-time migration of settings stored in window.localStorage by versions
// up to 1.5.3. Only possible where localStorage exists: the options page, and
// the Firefox background page. (A Chrome service worker cannot read it.)
export async function migrateFromLocalStorage() {
  let ls;
  try {
    ls = globalThis.localStorage;
  } catch {
    return;
  }
  if (!ls) { return; }

  const { migrated_from_localStorage } = await browser.storage.local.get("migrated_from_localStorage");
  if (migrated_from_localStorage) { return; }

  const data = {};
  for (const key of SETTING_KEYS) {
    const value = ls.getItem(key);
    if (value !== null) {
      data[key] = String(value);
    }
  }
  data.migrated_from_localStorage = true;
  await browser.storage.local.set(data);
}

// Pull settings from sync storage into local storage
export async function loadFromSync() {
  const { use_sync } = await getSettings();
  if (use_sync == "no") { return; }

  try {
    const items = await browser.storage.sync.get(SYNCED_KEYS);
    if (Object.keys(items).length) {
      await browser.storage.local.set(items);
    }
  } catch (error) {
    console.warn("Loading from sync storage failed: ", error);
  }
}

// Push local settings to sync storage. Returns true on success.
export async function saveToSync() {
  const settings = await getSettings();
  if (settings.use_sync == "no") { return false; }

  const data = {};
  for (const key of SYNCED_KEYS) {
    data[key] = settings[key];
  }

  try {
    await browser.storage.sync.set(data);
    return true;
  } catch (error) {
    console.warn("Storage saving failed: ", error);
    return false;
  }
}

// Apply sync storage changes (made on another device) to local settings.
// Returns true if anything actually changed.
export async function applySyncChanges(changes) {
  const settings = await getSettings();
  if (settings.use_sync == "no") { return false; }

  const updates = {};
  for (const key of SYNCED_KEYS) {
    const newValue = changes[key]?.newValue;
    if (typeof newValue !== "undefined" && String(newValue) !== String(settings[key])) {
      updates[key] = newValue;
    }
  }

  if (!Object.keys(updates).length) { return false; }
  await browser.storage.local.set(updates);
  return true;
}

// Runtime state that must survive the service worker being suspended,
// but not a browser restart.
const STATE_DEFAULTS = {
  last_unread_count: 0,
  retry_count: 0,
  last_error: "",
};

export async function getState() {
  const area = browser.storage.session ?? browser.storage.local;
  const stored = await area.get(Object.keys(STATE_DEFAULTS));
  return {...STATE_DEFAULTS, ...stored};
}

export async function setState(values) {
  const area = browser.storage.session ?? browser.storage.local;
  await area.set(values);
}
