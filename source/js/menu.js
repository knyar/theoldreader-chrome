function addContentMenus() {
  chrome.contextMenus.create(
    {"title": "The Old Reader", id: "root"}
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
    "title": "Subscribe to page",
    "id": "subscribe",
    "parentId": "root",
    contexts: ["page"],
    "onclick": function(info, tab) {
      chrome.tabs.create({
        url: baseUrl() + "feeds/subscribe?url=" + encodeURIComponent(tab.url)
      });
    }
  });

  chrome.contextMenus.create({
    "title": "Bookmark page",
    "id": "bookmarkPage",
    "parentId": "root",
    contexts: ["page"],
    "onclick": function(info, tab) {
      var args = "\""+baseUrl()+"bookmarks/bookmark\",\""+info.pageUrl+"\"";
      chrome.tabs.create({
        url: "javascript:"+bookmark+";bookmark("+args+")"
      });
    }
  });

  chrome.contextMenus.create({
    "title": "Bookmark selection",
    "id": "bookmarkSelection",
    contexts: ["selection"],
    "onclick": function(info, tab) {
      var selection = info.selectionText.replace(/\"/gm, '\\"');
      var args = "\""+baseUrl()+"bookmarks/bookmark\",\""+info.pageUrl+"\", \""+selection+"\"";
      console.log(args);
      chrome.tabs.create({
        url: "javascript:"+bookmark+";bookmark("+args+")"
      });
    }
  });
}

var contextMenusEnabled = false;

function toggleContentMenus(state) {
  if(state == 'no') {
    chrome.contextMenus.removeAll();
    contextMenusEnabled = false;
  } else {
    addContentMenus();
    contextMenusEnabled = true;
  }
}

// Initialize on extension load up
toggleContentMenus(localStorage.context_menu);
