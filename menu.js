var parent = chrome.contextMenus.create({"title": "The Old Reader"});

chrome.contextMenus.create({
  "title": "Subscribe to page",
  "parentId": parent,
  contexts: ["page"],
  "onclick": function(info, tab) {
    chrome.tabs.create({
      url: baseUrl() + "feeds/subscribe?url=" + encodeURIComponent(tab.url)
    })
  }
});

chrome.contextMenus.create({
  "title": "Bookmark page",
  "parentId": parent,
  contexts: ["page"],
  "onclick": function(info, tab) {
    chrome.tabs.executeScript(tab.id, { file: "bookmarklet.js" });
  }
});

chrome.contextMenus.create({
  "title": "Bookmark selection",
  contexts: ["selection"],
  "onclick": function(info, tab) {
    chrome.tabs.executeScript(tab.id, { file: "bookmarklet.js" });
  }
});
