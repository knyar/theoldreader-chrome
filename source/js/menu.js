/* global baseUrl, getCountersFromHTTP */
function addContentMenus() {
  // add button context menu
  chrome.contextMenus.create({
    title: chrome.i18n.getMessage('button_contextMenu_updateFromServerNow'),
    contexts: ['browser_action'],
    onclick: getCountersFromHTTP,
  });

  chrome.contextMenus.create(
    {title: "The Old Reader", id: "root", contexts: ["page"]}
  );

  const bookmark = function(url, selection) {
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
          chrome.tabs.create({url: httpRequest.responseURL}, function(tab) {
            chrome.tabs.executeScript(
              tab.id,
              {file: chrome.runtime.getURL('js/bookmark-cancel-script.js'), runAt: 'document_idle'}
            );
          });
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
  };

  chrome.contextMenus.create({
    title: chrome.i18n.getMessage('contextMenu_subscribeToPage'),
    id: "subscribe",
    parentId: "root",
    contexts: ["page"],
    onclick: function(info, tab) {
      chrome.tabs.create({
        url: baseUrl() + "feeds/subscribe?url=" + encodeURIComponent(tab.url)
      });
    }
  });

  chrome.contextMenus.create({
    title: chrome.i18n.getMessage('contextMenu_bookmarkPage'),
    id: "bookmarkPage",
    parentId: "root",
    contexts: ["page"],
    onclick: function(info) {
      bookmark(info.pageUrl);
    }
  });

  chrome.contextMenus.create({
    title: chrome.i18n.getMessage('contextMenu_bookmarkSelection'),
    id: "bookmarkSelection",
    contexts: ["selection"],
    onclick: function(info) {
      bookmark(info.pageUrl, info.selectionText);
    }
  });
}

function toggleContentMenus(state) {
  if (state == 'no') {
    chrome.contextMenus.removeAll();
  } else {
    chrome.contextMenus.removeAll(function() {
      addContentMenus();
    });
  }
}

// Initialize on extension load up
toggleContentMenus(localStorage.context_menu);
