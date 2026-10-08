import "./lib/browser-polyfill.js";
import { baseUrl, getCountersFromHTTP } from "./functions.js";

const REQUEST_TIMEOUT_MS = 20000;

function addContentMenus() {
  // add button context menu
  browser.contextMenus.create({
    title: browser.i18n.getMessage('button_contextMenu_updateFromServerNow'),
    contexts: ['action'],
    id: "update-counts-now"
  });

  browser.contextMenus.create(
    {title: "The Old Reader", id: "root", contexts: ["page"]}
  );

  browser.contextMenus.create({
    title: browser.i18n.getMessage('contextMenu_subscribeToPage'),
    id: "subscribe",
    parentId: "root",
    contexts: ["page"]
  });

  browser.contextMenus.create({
    title: browser.i18n.getMessage('contextMenu_bookmarkPage'),
    id: "bookmarkPage",
    parentId: "root",
    contexts: ["page"]
  });

  browser.contextMenus.create({
    title: browser.i18n.getMessage('contextMenu_bookmarkSelection'),
    id: "bookmarkSelection",
    contexts: ["selection"]
  });
}

async function bookmark(url, selection) {
  try {
    const params = new URLSearchParams({"saved_post[url]": url});
    if (selection) {
      params.append("saved_post[content]", selection);
    }

    const response = await fetch(
      `${await baseUrl()}bookmarks/bookmark`, {
        method: "POST",
        body: params,
        credentials: "include",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      }
    );

    if (response.ok) {
      await browser.tabs.create({url: response.url});
    } else {
      throw new Error(`HTTP error ${response.status}`);
    }
  } catch (error) {
    console.warn(error.message);
  }
}

export async function onContextMenuClick(info, tab) {
  switch (info.menuItemId) {
    case "update-counts-now":
      await getCountersFromHTTP();
      break;
    case "subscribe":
      await browser.tabs.create({
        url: (await baseUrl()) + "feeds/subscribe?url=" + encodeURIComponent(tab.url)
      });
      break;
    case "bookmarkPage":
      await bookmark(info.pageUrl);
      break;
    case "bookmarkSelection":
      await bookmark(info.pageUrl, info.selectionText);
      break;
  }
}

// Rebuilds are chained so that concurrent calls (e.g. onStartup and
// onInstalled firing together) cannot create duplicate menu ids.
let menuQueue = Promise.resolve();

export function toggleContentMenus(state) {
  menuQueue = menuQueue.then(async() => {
    await browser.contextMenus.removeAll();
    if (state != 'no') {
      addContentMenus();
    }
  }).catch((error) => {
    console.warn("Could not update context menus: ", error);
  });
  return menuQueue;
}
