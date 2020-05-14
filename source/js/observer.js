// vim: set ts=2 sw=2 et
// Credit for the solution goes to http://stackoverflow.com/a/11694229

let observer;

if (typeof window.injected === "undefined") { // Inject guard for #40
  window.injected = true;

  const target = document.querySelector('head > title');

  observer = new window.MutationObserver(
    function(mutations) {
      mutations.forEach(
        function(mutation) {
          notify(mutation.target.textContent, true);
        }
      );
    }
  );

  observer.observe(
    target,
    {
      subtree: true,
      characterData: true,
      childList: true
    }
  );

  notify(target.textContent, false);

  // Declare extension capabilities to the page
  const capabilities = {
    openInBackground: true
  };

  exposeCapabilities(capabilities);

  // Add an event listener for openPostInBackground
  window.addEventListener(
    "tor:openPostInBackground",
    openInBackgroundHandler,
    false
  );

}

function openInBackgroundHandler(evt) {
  chrome.runtime.sendMessage({openInBackground: true, url: evt.detail});
}

function exposeCapabilities(capabilities) {
  // Extend capabilities without overriding, in case there is another extension
  let code = "window.ExtensionCapabilities = window.ExtensionCapabilities || {};";
  for (let key in capabilities) {
    code += "window.ExtensionCapabilities[" + JSON.stringify(key) +
            "] = " + JSON.stringify(capabilities[key]) + ";";
  }

  let script = document.createElement('script');
  script.textContent = code;
  (document.head || document.documentElement).appendChild(script);
  script.parentNode.removeChild(script);
}

function notify(title, changed) {
  let count = -1;

  const match = /^\((\d+)\)/.exec(title);
  const match_zero = /^The Old Reader$/.exec(title); // Does not fire on navigation

  if (match && match[1]) {
    count = match[1];
  } else if (match_zero && changed) {
    count = 0;
  }

  if (count >= 0) {
    try {
      chrome.runtime.sendMessage({count: count});
    } catch (e) { // Happens when parent extension is no longer available or was reloaded
      console.warn("Could not communicate with parent extension, deregistering observer");
      observer.disconnect();
    }
  }
}
