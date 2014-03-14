// vim: set ts=2 sw=2 et
// Credit for the solution goes to http://stackoverflow.com/a/11694229

var target = document.querySelector('head > title');

var observer = new window.WebKitMutationObserver(
  function(mutations) {
    mutations.forEach(
      function(mutation){
        notify(mutation.target.textContent, true);
      }
    );
  }
);

observer.observe(target, { subtree: true, characterData: true, childList: true });

notify(target.textContent, false);

function notify(title, changed) {
  var count = -1;

  var match = /^\((\d+)\)/.exec(title);
  var match_zero = /^The Old Reader$/.exec(title); // Does not fire on navigation

  if (match && match[1]) {
    count = match[1];
  } else if (match_zero && changed) {
    count = 0;
  }

  if (count >= 0) {
    try {
      chrome.runtime.sendMessage({'count' : count});
      console.log("Observer reported "+count+" to extension");
    } catch(e) { // Happens when parent extension is no longer available or was reloaded
      console.warn("Could not communicate with parent extension, deregistering observer");
      observer.disconnect();
    }
  }
}
