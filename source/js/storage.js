/* global toggleContentMenus */
/* exported loadFromStorage */
function loadFromStorage() {
  if (localStorage.use_sync == "no") { return; }

  chrome.storage.sync.get(null, function(items) {
    for (let key in items) {
      localStorage[key] = items[key];
    }
  });
}

let syncRetry;

/* exported saveToStorage */
function saveToStorage(callback) {
  if (localStorage.use_sync == "no") { return; }

  if (syncRetry) {
    console.log("Already waiting for a sync attempt, throttling request");
    if (callback) { callback(false); }
    return;
  }

  let data = {};
  Object.keys(localStorage).forEach((key) => {
    data[key] = localStorage[key];
  });

  chrome.storage.sync.set(data, retryOnError(saveToStorage, callback));
}

// callback (optional function) will be called with true/false depending on success of the attempt (once)
function retryOnError(retryFunction, callback) {
  return function() {
    if (chrome.runtime.lastError) {
      console.warn("Will retry in a minute due to ", chrome.runtime.lastError.message);
      if (callback) { callback(false); }

	  /*
	  // old code
      syncRetry = window.setTimeout(function() {
        syncRetry = null;
        retryFunction();
      }, 60 * 1000);
	  */
	  // transition to chrome.alarms instead of window.setTimeout
	  syncRetry = true;
      chrome.alarms.onAlarm.addListener(retryOnErrorAlarmFn.bind(null, retryFunction));
      chrome.alarms.create('retryAlarm', {delayInMinutes:1});

    } else {
      if (callback) { callback(true); }
    }
  };
}
// required if (see above) transition to chrome.alarms instead of window.setTimeout
function retryOnErrorAlarmFn(retryFunction, Alarm) {
	if (Alarm.name != 'retryAlarm') { return; }
    syncRetry = null;
    retryFunction();
}

/* exported onStorageChange */
function onStorageChange(changes, area) {
  if (area != "sync") { return; }

  if (localStorage.use_sync == "no") { return; }

  for (let key in changes) {
    if (typeof changes[key].newValue === "undefined") { // Key deleted
      //delete localStorage[key];
    } else {
      localStorage[key] = changes[key].newValue;

      // Quick & Dirty listener for context menu option changes for toggling state
      if (key == 'context_menu') {
        toggleContentMenus(localStorage[key]);
      }
    }
  }

  chrome.runtime.sendMessage({update: true});
}
