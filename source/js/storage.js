import "./lib/browser-polyfill.js";
import { toggleContentMenus } from "./menu.js";

export async function loadFromStorage() {
  if (localStorage.use_sync == "no") { return; }

  const items = await browser.storage.sync.get(null);

  for (let key in items) {
    localStorage[key] = items[key];
  }
}

export async function saveToStorage(callback) {
  if (localStorage.use_sync == "no") { return; }

  let data = {};
  Object.keys(localStorage).forEach((key) => {
    data[key] = localStorage[key];
  });

  try {
    await browser.storage.sync.set(data);
    callback?.(true);
  } catch (error) {
    console.warn("Storage saving failed: ", error);
    callback?.(false);
  }
}

export function onStorageChange(changes, area) {
  if (area != "sync") { return; }

  if (localStorage.use_sync == "no") { return; }

  for (let key in changes) {
    if (typeof changes[key].newValue === "undefined") { // Key deleted
      //delete localStorage[key];
    } else {
      localStorage[key] = changes[key].newValue;

      // Quick & Dirty listener for context menu option changes for toggling state
      if (key == 'context_menu') {
        toggleContentMenus(localStorage[key]);
      }
    }
  }

  // Ignoring possible errors: if there are no other context, it will reject harmlessly
  browser.runtime.sendMessage({update: true}).catch(() => {});
}
