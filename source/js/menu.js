/* global baseUrl, getBrowserName */
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

  var bookmark = function bookmark(base_url, url, selection) {
    var f = document.createElement('form');
    f.setAttribute('method','post');
    f.setAttribute('action',base_url);

    var f1 = document.createElement('input');
    f1.setAttribute('type','hidden');
    f1.setAttribute('name','saved_post[url]');
    f1.setAttribute('value',url);
    f.appendChild(f1);

    if (selection) {
      var f2 = document.createElement('input');
      f2.setAttribute('type','hidden');
      f2.setAttribute('name','saved_post[content]');
      f2.setAttribute('value',selection);
      f.appendChild(f2);
    }

    document.getElementsByTagName('body')[0].appendChild(f);
    f.submit();
  }.toString().replace(/(\n|\t)/gm,'');

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

  // In Firefox, opening javascript: URLs is not allowed
  // Temporarily disabling those bookmaklet-like entries, will need a rewrite
  if (getBrowserName() == "Chrome") {
    chrome.contextMenus.create({
      title: chrome.i18n.getMessage('contextMenu_bookmarkPage'),
      id: "bookmarkPage",
      parentId: "root",
      contexts: ["page"],
      onclick: function(info) {
        var args = "\"" + baseUrl() + "bookmarks/bookmark\",\"" + info.pageUrl + "\"";
        chrome.tabs.create({
          url: "javascript:" + bookmark + ";bookmark(" + args + ")"
        });
      }
    });

    chrome.contextMenus.create({
      title: chrome.i18n.getMessage('contextMenu_bookmarkSelection'),
      id: "bookmarkSelection",
      contexts: ["selection"],
      onclick: function(info) {
        var selection = info.selectionText.replace(/"/gm, '\\"');
        var args = "\"" + baseUrl() + "bookmarks/bookmark\",\"" + info.pageUrl + "\", \"" + selection + "\"";
        console.log(args);
        chrome.tabs.create({
          url: "javascript:" + bookmark + ";bookmark(" + args + ")"
        });
      }
    });
  }
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
