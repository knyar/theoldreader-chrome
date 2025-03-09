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

function bookmark(url, selection) {
  let httpRequest = new XMLHttpRequest();
  httpRequest.timeout = 20000;
  httpRequest.ontimeout = function() {
    console.warn('HTTP request timed out');
  };
  httpRequest.onerror = function() {
    console.warn('HTTP request error');
  };

  httpRequest.onreadystatechange = function() {
    if (httpRequest.readyState == 4 && httpRequest.status !== 0) { // (4,0) means onerror will be fired next
      if (httpRequest.status >= 400) {
        console.warn('HTTP request failed');
      } else {
        browser.tabs.create({url: httpRequest.responseURL});
      }
    }
  };

  let params = `saved_post[url]=${encodeURIComponent(url)}`;
  if (selection) {
    params = `${params}&saved_post[content]=${encodeURIComponent(selection)}`;
  }
  httpRequest.open('POST', `${baseUrl()}bookmarks/bookmark`, true);
  httpRequest.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
  httpRequest.send(params);
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
