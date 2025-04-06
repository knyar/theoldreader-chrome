import "./lib/browser-polyfill.js";
import { baseUrl, getCountersFromHTTP } from "./functions.js";

export function addContentMenus() {
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
      `${baseUrl()}bookmarks/bookmark`, {
        body: params,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        }
      }
    );

    if (response.ok) {
      browser.tabs.create({url: response.url});
    } else {
      throw new Error(`HTTP error ${response.status}`);
    }
  } catch (error) {
    console.warn(error.message);
  }
}

export function onContextMenuClick(info, tab) {
  switch (info.menuItemId) {
    case "update-counts-now":
      getCountersFromHTTP();
      break;
    case "subscribe":
      browser.tabs.create({
        url: baseUrl() + "feeds/subscribe?url=" + encodeURIComponent(tab.url)
      });
      break;
    case "bookmarkPage":
      bookmark(info.pageUrl);
      break;
    case "bookmarkSelection":
      bookmark(info.pageUrl, info.selectionText);
      break;
  }
}

export async function toggleContentMenus(state) {
  if (state == 'no') {
    browser.contextMenus.removeAll();
  } else {
    browser.contextMenus.removeAll(function() {
      addContentMenus();
    });
  }
}
