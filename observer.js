// Credit for the solution goes to http://stackoverflow.com/a/11694229

var target = document.querySelector('head > title');

var observer = new window.WebKitMutationObserver(
  function(mutations) {
    mutations.forEach(notify);
  }
);

observer.observe(target, { subtree: true, characterData: true, childList: true });

function notify(mutation) {
  var title = mutation.target.textContent;
  var count;

  var match = /^\((\d+)\)/.exec(title);
  var match_zero = /^The Old Reader$/.exec(title); // Does not fire on navigation

  if (match && match[1]) {
    count = match[1];
  } else if (match_zero) {
    count = 0;
  }

  if (typeof count !== 'undefined') {
    console.log("Observer reported "+count+" to extension");
    chrome.extension.sendMessage({'count' : count});
  }
}
